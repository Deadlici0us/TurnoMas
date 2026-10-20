/**
 * Paywall de suscripción (Módulo 1): 14 días de prueba, luego
 * bloqueo si no hay plan de MercadoPago activo (`suscripcion_mp_id`).
 *
 * El bloqueo nunca es "duro" en el borde del período: se concede un margen
 * (`MP_MARGEN_RENOVACION_HORAS`, default 24) tanto para la mora como para el
 * vencimiento del período pago. Así, mientras MercadoPago renueva o el cron
 * de reconciliación confirma el pago, el cliente conserva el acceso. Con el
 * espejo `suscripcion_mp_status = "authorized"` no se bloquea por vencimiento.
 *
 * Función pura para facilitar TDD y reutilización en Route Handlers, Server
 * Components y Server Actions.
 */

export const TRIAL_DAYS = 14;

/** Margen por defecto (horas) para confirmar una renovación antes de bloquear. */
export const MARGEN_RENOVACION_HORAS_DEFAULT = 24;

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

export type SubscriptionStatus = "demo" | "trial" | "active" | "past_due" | "blocked";

export interface SubscriptionInput
{
  readonly createdAt: Date;
  readonly now: Date;
  readonly suscripcionEstado: string | null;
  readonly suscripcionMpId: string | null;
  readonly suscripcionMoraDesde?: Date | null;
  readonly suscripcionVenceEn?: Date | null;
  readonly suscripcionCanceladaEn?: Date | null;
  /** Espejo del estado del preapproval en MP (`authorized`/`cancelled`/`paused`). */
  readonly suscripcionMpStatus?: string | null;
  /** Margen de confirmación en horas; default `MARGEN_RENOVACION_HORAS_DEFAULT`. */
  readonly margenHoras?: number;
}

/** Indica si la mora sigue dentro del margen de confirmación. */
function moraEnMargen(
  moraDesde: Date | null | undefined,
  now: Date,
  margenMs: number,
): boolean
{
  if (moraDesde === null || moraDesde === undefined || Number.isNaN(moraDesde.getTime()))
  {
    return false;
  }

  const elapsedMs = now.getTime() - moraDesde.getTime();

  return elapsedMs >= 0 && elapsedMs <= margenMs;
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
 * Indica si una suscripción activa ya pasó el período pago más el margen.
 *
 * Sin vencimiento conocido (dato legado) se sigue tratando como vigente para
 * no cortar el acceso de forma prematura.
 *
 * @param venceEn Fin del período pago.
 * @param now Momento de referencia.
 * @param margenMs Margen de confirmación en milisegundos.
 * @return `true` cuando corresponde bloquear por vencimiento.
 */
function vencimientoSuperado(
  venceEn: Date | null | undefined,
  now: Date,
  margenMs: number,
): boolean
{
  if (venceEn === null || venceEn === undefined || Number.isNaN(venceEn.getTime()))
  {
    return false;
  }

  return now.getTime() > venceEn.getTime() + margenMs;
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
  const margenMs = (input.margenHoras ?? MARGEN_RENOVACION_HORAS_DEFAULT) * MS_PER_HOUR;
  const hasActiveSubscription = input.suscripcionEstado === "active"
    && input.suscripcionMpId !== null
    && input.suscripcionMpId.length > 0;

  if (hasActiveSubscription)
  {
    // Canceló: conserva el acceso hasta `vence_en` + margen y recién ahí bloquea.
    if (input.suscripcionCanceladaEn !== null && input.suscripcionCanceladaEn !== undefined
      && vencimientoSuperado(input.suscripcionVenceEn, input.now, margenMs))
    {
      return "blocked";
    }

    // MercadoPago confirma la suscripción autorizada: no se bloquea por fecha.
    if (input.suscripcionMpStatus === "authorized")
    {
      return "active";
    }

    // Sin confirmación de MP, se concede el margen antes de bloquear.
    if (vencimientoSuperado(input.suscripcionVenceEn, input.now, margenMs))
    {
      return "blocked";
    }

    return "active";
  }

  if (input.suscripcionEstado === "past_due" && moraEnMargen(input.suscripcionMoraDesde, input.now, margenMs))
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
