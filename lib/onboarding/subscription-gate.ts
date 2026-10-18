/**
 * Gate de suscripción del dashboard (Módulo 1, paywall 14 días).
 *
 * Envuelve `evaluateSubscription` para filas `negocios` reales o
 * seed en memoria (sin `created_at` → trial, nunca bloquea la demo).
 * Resuelve el margen de confirmación desde `MP_MARGEN_RENOVACION_HORAS`.
 */

import { readEnv } from "@/lib/env/env";
import type { EnvRecord } from "@/lib/env/env";

import { evaluateSubscription, MARGEN_RENOVACION_HORAS_DEFAULT } from "./trial";
import type { SubscriptionStatus } from "./trial";

export interface NegocioSubscriptionRow
{
  readonly created_at: string | null;
  readonly suscripcion_estado: string | null;
  readonly suscripcion_mp_id: string | null;
  readonly suscripcion_mora_desde?: string | null;
  readonly suscripcion_vence_en?: string | null;
  readonly suscripcion_cancelada_en?: string | null;
  readonly suscripcion_mp_status?: string | null;
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

/**
 * Resuelve el margen de confirmación (horas) desde `MP_MARGEN_RENOVACION_HORAS`.
 *
 * Un valor ausente, no numérico o no positivo cae al default.
 *
 * @param env Registro de entorno (por defecto `process.env`).
 * @return Horas de margen antes de bloquear por vencimiento/mora.
 */
export function resolverMargenRenovacionHoras(env: EnvRecord = process.env): number
{
  const crudo = readEnv("MP_MARGEN_RENOVACION_HORAS", env);

  if (crudo === null)
  {
    return MARGEN_RENOVACION_HORAS_DEFAULT;
  }

  const horas = Number(crudo);

  if (!Number.isFinite(horas) || horas <= 0)
  {
    return MARGEN_RENOVACION_HORAS_DEFAULT;
  }

  return horas;
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
    suscripcionMpStatus: negocio.suscripcion_mp_status,
    margenHoras: resolverMargenRenovacionHoras(),
  });
}
