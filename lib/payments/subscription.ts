/**
 * Suscripciones SaaS vía Preapproval de MercadoPago (plan 14.999 ARS/mes).
 *
 * Todo corre con el token de la plataforma: el dueño autoriza el débito
 * con su tarjeta y MP cobra solo cada mes. Funciones puras con fetch
 * inyectable para tests sin red. Nunca loguear valores de tokens.
 * Montos en pesos enteros (MP espera pesos, no centavos).
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

const MP_API_BASE = "https://api.mercadopago.com";

/** Precio mensual del plan en pesos argentinos. */
export const MONTO_PLAN_PESOS = 14999;

/** Resuelve el monto del plan desde `MP_PLAN_MONTO` (default 14999). */
export function resolverMontoPlan(env: EnvRecord = process.env): number
{
  const crudo = readEnv("MP_PLAN_MONTO", env);

  if (crudo === null)
  {
    return MONTO_PLAN_PESOS;
  }

  const monto = Number(crudo);

  if (!Number.isInteger(monto) || monto <= 0)
  {
    throw new RangeError("MP_PLAN_MONTO debe ser un entero positivo en pesos.");
  }

  return monto;
}

export interface PreapprovalInput
{
  readonly negocioId: string;
  readonly payerEmail: string;
  readonly backUrl: string;
  readonly montoPesos: number;
  readonly platformToken: string;
}

export interface PreapprovalCreada
{
  readonly id: string;
  readonly initPoint: string;
}

export interface PreapprovalEstado
{
  readonly id: string;
  readonly status: string;
  readonly externalReference: string | null;
  readonly payerEmail: string | null;
}

export interface CobroSuscripcion
{
  readonly id: string;
  readonly status: string;
  readonly payerEmail: string | null;
}

export interface PreapprovalPorEmail
{
  readonly id: string;
  readonly externalReference: string | null;
}

type FetchFn = typeof fetch;

/** Crea el preapproval mensual y devuelve el link de autorización. */
export async function crearPreapproval(input: PreapprovalInput, fetchFn: FetchFn = fetch): Promise<PreapprovalCreada>
{
  const response = await fetchFn(`${MP_API_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.platformToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "TurnoMas - Plan mensual",
      payer_email: input.payerEmail,
      external_reference: input.negocioId,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.montoPesos,
        currency_id: "ARS",
      },
    }),
  });

  if (!response.ok)
  {
    throw new Error("No se pudo crear la suscripción en MercadoPago.");
  }

  const data = (await response.json()) as { id?: unknown; init_point?: unknown };

  if (typeof data.id !== "string" || typeof data.init_point !== "string")
  {
    throw new Error("Respuesta inválida de MercadoPago al crear la suscripción.");
  }

  return { id: data.id, initPoint: data.init_point };
}

/** Consulta un preapproval por ID con el token de plataforma. */
export async function consultarPreapproval(
  preapprovalId: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<PreapprovalEstado>
{
  const response = await fetchFn(`${MP_API_BASE}/preapproval/${preapprovalId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${platformToken}` },
  });

  if (!response.ok)
  {
    throw new Error(`No se pudo consultar la suscripción: ${response.status}`);
  }

  const data = (await response.json()) as {
    id?: unknown; status?: unknown; external_reference?: unknown; payer_email?: unknown;
  };

  return {
    id: typeof data.id === "string" ? data.id : preapprovalId,
    status: typeof data.status === "string" ? data.status : "unknown",
    externalReference: typeof data.external_reference === "string" ? data.external_reference : null,
    payerEmail: typeof data.payer_email === "string" ? data.payer_email : null,
  };
}

/** Cancela un preapproval con el token de plataforma. */
export async function cancelarPreapproval(
  preapprovalId: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<void>
{
  const response = await fetchFn(`${MP_API_BASE}/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${platformToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  if (!response.ok)
  {
    throw new Error("No se pudo cancelar la suscripción en MercadoPago.");
  }
}

/**
 * Consulta un cobro recurrente como pago normal.
 *
 * Los cargos de la suscripción viven en la cuenta plataforma, así que el
 * ID del webhook `subscription_authorized_payment` se consulta igual que
 * un pago de seña. Si MP lo modela distinto (404), el llamador lo ignora.
 */
export async function consultarCobroSuscripcion(
  paymentId: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<CobroSuscripcion>
{
  const response = await fetchFn(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${platformToken}` },
  });

  if (!response.ok)
  {
    throw new Error(`No se pudo consultar el cobro de suscripción: ${response.status}`);
  }

  const data = (await response.json()) as {
    id?: unknown; status?: unknown; payer?: { email?: unknown } | null;
  };

  return {
    id: String(data.id ?? paymentId),
    status: typeof data.status === "string" ? data.status : "unknown",
    payerEmail: typeof data.payer?.email === "string" ? data.payer.email : null,
  };
}

/**
 * Busca el preapproval de un pagador por email.
 *
 * Mapea un cobro recurrente a su negocio vía `external_reference`.
 * Null si no hay resultados.
 */
export async function buscarPreapprovalPorEmail(
  payerEmail: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<PreapprovalPorEmail | null>
{
  const params = new URLSearchParams({ payer_email: payerEmail });
  const response = await fetchFn(`${MP_API_BASE}/preapproval/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${platformToken}` },
  });

  if (!response.ok)
  {
    throw new Error("No se pudo buscar la suscripción por email.");
  }

  const data = (await response.json()) as {
    results?: { id?: unknown; external_reference?: unknown }[];
  };

  const primero = Array.isArray(data.results) ? data.results[0] : undefined;

  if (primero === undefined || typeof primero.id !== "string")
  {
    return null;
  }

  return {
    id: primero.id,
    externalReference: typeof primero.external_reference === "string"
      ? primero.external_reference
      : null,
  };
}
