/**
 * Gate de suscripción del dashboard (Módulo 1, paywall 14 días).
 *
 * Envuelve `evaluateSubscription` para filas `negocios` reales o
 * seed en memoria (sin `created_at` → trial, nunca bloquea la demo).
 */

import { evaluateSubscription } from "./trial";
import type { SubscriptionStatus } from "./trial";

export interface NegocioSubscriptionRow
{
  readonly created_at: string | null;
  readonly suscripcion_estado: string | null;
  readonly suscripcion_mp_id: string | null;
}

/** Calcula trial/active/blocked para un negocio (o seed sin fecha). */
export function getNegocioSubscriptionStatus(
  negocio: NegocioSubscriptionRow,
  now: Date = new Date(),
): SubscriptionStatus
{
  if (negocio.created_at === null)
  {
    return "trial";
  }

  const createdAt = new Date(negocio.created_at);

  if (Number.isNaN(createdAt.getTime()))
  {
    return "trial";
  }

  return evaluateSubscription({
    createdAt,
    now,
    suscripcionEstado: negocio.suscripcion_estado,
    suscripcionMpId: negocio.suscripcion_mp_id,
  });
}
