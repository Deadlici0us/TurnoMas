/**
 * Paywall de suscripción (Módulo 1): 14 días de prueba, luego
 * bloqueo si no hay plan de MercadoPago activo (`suscripcion_mp_id`).
 *
 * Función pura para facilitar TDD y reutilización en
 * Route Handlers, Server Components y Server Actions.
 */

export const TRIAL_DAYS = 14;

const MS_PER_DAY = 86_400_000;

export type SubscriptionStatus = "trial" | "active" | "blocked";

export interface SubscriptionInput
{
  readonly createdAt: Date;
  readonly now: Date;
  readonly suscripcionEstado: string | null;
  readonly suscripcionMpId: string | null;
}

/** Evalúa si la cuenta está en prueba, activa o bloqueada por falta de pago. */
export function evaluateSubscription(input: SubscriptionInput): SubscriptionStatus
{
  const hasActiveSubscription = input.suscripcionEstado === "active"
    && input.suscripcionMpId !== null
    && input.suscripcionMpId.length > 0;

  if (hasActiveSubscription)
  {
    return "active";
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
