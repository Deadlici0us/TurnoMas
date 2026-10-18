/**
 * Paywall de suscripción (Módulo 1): 14 días de prueba, luego
 * bloqueo si no hay plan de MercadoPago activo (`suscripcion_mp_id`).
 *
 * Con mora (`past_due`) hay 5 días de gracia desde `suscripcion_mora_desde`
 * antes de bloquear. Función pura para facilitar TDD y reutilización en
 * Route Handlers, Server Components y Server Actions.
 */

export const TRIAL_DAYS = 14;
export const GRACIA_PAST_DUE_DIAS = 5;

const MS_PER_DAY = 86_400_000;

export type SubscriptionStatus = "trial" | "active" | "past_due" | "blocked";

export interface SubscriptionInput
{
  readonly createdAt: Date;
  readonly now: Date;
  readonly suscripcionEstado: string | null;
  readonly suscripcionMpId: string | null;
  readonly suscripcionMoraDesde?: Date | null;
  readonly suscripcionVenceEn?: Date | null;
  readonly suscripcionCanceladaEn?: Date | null;
}

/** Indica si la mora sigue dentro de la gracia. */
function moraEnGracia(moraDesde: Date | null | undefined, now: Date): boolean
{
  if (moraDesde === null || moraDesde === undefined || Number.isNaN(moraDesde.getTime()))
  {
    return false;
  }

  const elapsedMs = now.getTime() - moraDesde.getTime();

  return elapsedMs >= 0 && elapsedMs / MS_PER_DAY <= GRACIA_PAST_DUE_DIAS;
}

/** Días restantes de prueba desde la creación (null sin fecha válida). */
export function diasTrialRestantes(createdAt: string | null, now: Date = new Date()): number | null
{
  if (createdAt === null)
  {
    return null;
  }

  const inicio = new Date(createdAt).getTime();

  if (Number.isNaN(inicio))
  {
    return null;
  }

  return Math.max(0, Math.ceil((TRIAL_DAYS * MS_PER_DAY - (now.getTime() - inicio)) / MS_PER_DAY));
}

/**
 * Días restantes de la suscripción hasta su vencimiento (renovación o fin de
 * período tras cancelar). Null sin fecha válida; 0 si ya venció.
 *
 * @param venceEn Fin del período pago (`suscripcion_vence_en`) en ISO 8601.
 * @param now Momento de referencia.
 * @return Días enteros restantes (>= 0) o null.
 */
export function diasSuscripcionRestantes(venceEn: string | null, now: Date = new Date()): number | null
{
  if (venceEn === null)
  {
    return null;
  }

  const fin = new Date(venceEn).getTime();

  if (Number.isNaN(fin))
  {
    return null;
  }

  return Math.max(0, Math.ceil((fin - now.getTime()) / MS_PER_DAY));
}

/**
 * Indica si una suscripción activa ya venció estando cancelada.
 *
 * Tras cancelar se conserva el acceso hasta `suscripcion_vence_en`; pasada
 * esa fecha el gate bloquea. Sin vencimiento conocido (dato legado) se sigue
 * tratando como activa para no cortar el acceso de forma prematura.
 *
 * @param venceEn Fin del período pago.
 * @param canceladaEn Marca de cancelación (null = auto-renueva).
 * @param now Momento de referencia.
 * @return `true` cuando corresponde bloquear por vencimiento post-cancelación.
 */
function canceladaVencida(
  venceEn: Date | null | undefined,
  canceladaEn: Date | null | undefined,
  now: Date,
): boolean
{
  if (canceladaEn === null || canceladaEn === undefined)
  {
    return false;
  }

  if (venceEn === null || venceEn === undefined || Number.isNaN(venceEn.getTime()))
  {
    return false;
  }

  return now.getTime() > venceEn.getTime();
}

/** Aviso de suscripción para el dashboard (null sin nada que avisar). */
export function avisoSuscripcion(
  estado: SubscriptionStatus,
  createdAt: string | null,
  now: Date = new Date(),
): string | null
{
  if (estado === "past_due")
  {
    return "Falló el último cobro del plan. Regularizá tu tarjeta para no perder el acceso.";
  }

  const restantes = diasTrialRestantes(createdAt, now);

  if (estado === "trial" && restantes !== null && restantes <= 3)
  {
    return `Te quedan ${restantes} días de prueba. Activá el plan para no interrumpir tu agenda.`;
  }

  return null;
}

/** Evalúa si la cuenta está en prueba, activa, en mora o bloqueada. */
export function evaluateSubscription(input: SubscriptionInput): SubscriptionStatus
{
  const hasActiveSubscription = input.suscripcionEstado === "active"
    && input.suscripcionMpId !== null
    && input.suscripcionMpId.length > 0;

  if (hasActiveSubscription)
  {
    if (canceladaVencida(input.suscripcionVenceEn, input.suscripcionCanceladaEn, input.now))
    {
      return "blocked";
    }

    return "active";
  }

  if (input.suscripcionEstado === "past_due" && moraEnGracia(input.suscripcionMoraDesde, input.now))
  {
    return "past_due";
  }

  const elapsedMs = input.now.getTime() - input.createdAt.getTime();

  if (elapsedMs < 0)
  {
    return "trial";
  }

  const elapsedDays = elapsedMs / MS_PER_DAY;

  if (elapsedDays <= TRIAL_DAYS)
  {
    return "trial";
  }

  return "blocked";
}
