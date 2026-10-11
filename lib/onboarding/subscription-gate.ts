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
  readonly suscripcion_mora_desde?: string | null;
}

/** Calcula trial/active/past_due/blocked para un negocio (o seed sin fecha). */
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

  const moraCruda = negocio.suscripcion_mora_desde ?? null;
  const moraDesde = moraCruda === null ? null : new Date(moraCruda);

  return evaluateSubscription({
    createdAt,
    now,
    suscripcionEstado: negocio.suscripcion_estado,
    suscripcionMpId: negocio.suscripcion_mp_id,
    suscripcionMoraDesde: moraDesde !== null && !Number.isNaN(moraDesde.getTime()) ? moraDesde : null,
  });
}
