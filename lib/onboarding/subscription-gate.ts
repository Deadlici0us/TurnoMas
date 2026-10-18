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
  readonly suscripcion_vence_en?: string | null;
  readonly suscripcion_cancelada_en?: string | null;
}

/** Convierte un ISO 8601 a Date o null si falta/es inválido. */
function aFecha(valor: string | null | undefined): Date | null
{
  if (valor === null || valor === undefined)
  {
    return null;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
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

  return evaluateSubscription({
    createdAt,
    now,
    suscripcionEstado: negocio.suscripcion_estado,
    suscripcionMpId: negocio.suscripcion_mp_id,
    suscripcionMoraDesde: aFecha(negocio.suscripcion_mora_desde),
    suscripcionVenceEn: aFecha(negocio.suscripcion_vence_en),
    suscripcionCanceladaEn: aFecha(negocio.suscripcion_cancelada_en),
  });
}
