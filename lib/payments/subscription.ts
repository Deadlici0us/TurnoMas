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

/**
 * Plan mensual por país.
 *
 * `planId` es el `preapproval_plan_id` de MercadoPago (plantilla creada una
 * vez). Hoy solo AR está implementado; el resto queda desacoplado con
 * `planId: null` hasta que se agregue la suscripción en USD.
 */
export interface PlanPais
{
  readonly monto: number;
  readonly currency: string;
  readonly etiqueta: string;
  readonly planId: string | null;
}

export const PLAN_POR_PAIS: Record<string, PlanPais> = {
  ar: { monto: 14999, currency: "ARS", etiqueta: "$ 14.999 ARS/mes", planId: null },
  mx: { monto: 15, currency: "USD", etiqueta: "U$S 15 USD/mes", planId: null },
};

export const PLAN_DEFAULT = PLAN_POR_PAIS.mx;

/** Precio mensual legacy en pesos argentinos (compatibilidad). */
export const MONTO_PLAN_PESOS = PLAN_POR_PAIS.ar.monto;

/** Lee un monto entero positivo de env o null si ausente. */
function leerMontoEnv(env: EnvRecord, name: string): number | null
{
  const crudo = readEnv(name, env);

  if (crudo === null)
  {
    return null;
  }

  const monto = Number(crudo);

  if (!Number.isInteger(monto) || monto <= 0)
  {
    throw new RangeError(`${name} debe ser un entero positivo.`);
  }

  return monto;
}

/** Resuelve el monto del plan desde `MP_PLAN_MONTO` (default 14999). */
export function resolverMontoPlan(env: EnvRecord = process.env): number
{
  return leerMontoEnv(env, "MP_PLAN_MONTO") ?? MONTO_PLAN_PESOS;
}

/**
 * Resuelve el plan por país del negocio (AR en ARS, resto en USD).
 *
 * Overrides de monto: `MP_PLAN_ARS` y `MP_PLAN_USD`. El `preapproval_plan_id`
 * sale de `MP_PLAN_ID_AR` / `MP_PLAN_ID_USD` (null si el país no está
 * implementado todavía).
 */
export function resolverPlanPais(pais: string | null, env: EnvRecord = process.env): PlanPais
{
  const codigo = (pais ?? "").trim().toLowerCase();

  if (codigo === "ar")
  {
    const monto = leerMontoEnv(env, "MP_PLAN_ARS") ?? PLAN_POR_PAIS.ar.monto;

    return { ...PLAN_POR_PAIS.ar, monto, planId: readEnv("MP_PLAN_ID_AR", env) };
  }

  const monto = leerMontoEnv(env, "MP_PLAN_USD") ?? PLAN_POR_PAIS.mx.monto;

  return { ...PLAN_POR_PAIS.mx, monto, planId: readEnv("MP_PLAN_ID_USD", env) };
}

export interface PreapprovalInput
{
  readonly negocioId: string;
  readonly payerEmail: string;
  readonly cardTokenId: string;
  readonly planId: string;
  readonly backUrl: string;
  readonly platformToken: string;
}

export interface PreapprovalCreada
{
  readonly id: string;
  readonly status: string;
}

export interface PlanInput
{
  readonly reason: string;
  readonly backUrl: string;
  readonly monto: number;
  readonly currency: string;
  readonly platformToken: string;
}

export interface PlanCreado
{
  readonly id: string;
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

/** Arma el error de MP incluyendo status y detalle para diagnóstico. */
async function errorMp(response: Response, mensaje: string): Promise<Error>
{
  let detalle = "";

  try
  {
    detalle = (await response.text()).slice(0, 300);
  }
  catch
  {
    detalle = "";
  }

  return new Error(
    `${mensaje} (HTTP ${response.status})${detalle.length > 0 ? `: ${detalle}` : ""}.`,
  );
}

/**
 * Crea el plan (plantilla) reutilizable en MercadoPago.
 *
 * Operación de administración: se corre una vez y su `id` se guarda en
 * `MP_PLAN_ID_AR`. No se crea un plan por negocio.
 */
export async function crearPlanPreapproval(input: PlanInput, fetchFn: FetchFn = fetch): Promise<PlanCreado>
{
  const response = await fetchFn(`${MP_API_BASE}/preapproval_plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.platformToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: input.reason,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.monto,
        currency_id: input.currency,
      },
      payment_methods_allowed: {
        payment_types: [{}],
        payment_methods: [{}],
      },
    }),
  });

  if (!response.ok)
  {
    throw await errorMp(response, "No se pudo crear el plan en MercadoPago");
  }

  const data = (await response.json()) as { id?: unknown };

  if (typeof data.id !== "string" || data.id.length === 0)
  {
    throw new Error("Respuesta inválida de MercadoPago al crear el plan.");
  }

  return { id: data.id };
}

/**
 * Crea la suscripción de un negocio sobre el plan (con tarjeta ya tokenizada).
 *
 * La suscripción con plan asociado exige `card_token_id` y `status: authorized`.
 */
export async function crearPreapproval(input: PreapprovalInput, fetchFn: FetchFn = fetch): Promise<PreapprovalCreada>
{
  const response = await fetchFn(`${MP_API_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.platformToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preapproval_plan_id: input.planId,
      reason: "TurnoMas - Plan mensual",
      payer_email: input.payerEmail,
      card_token_id: input.cardTokenId,
      external_reference: input.negocioId,
      back_url: input.backUrl,
      status: "authorized",
    }),
  });

  if (!response.ok)
  {
    throw await errorMp(response, "No se pudo crear la suscripción en MercadoPago");
  }

  const data = (await response.json()) as { id?: unknown; status?: unknown };

  if (typeof data.id !== "string" || data.id.length === 0)
  {
    throw new Error("Respuesta inválida de MercadoPago al crear la suscripción.");
  }

  return { id: data.id, status: typeof data.status === "string" ? data.status : "unknown" };
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
