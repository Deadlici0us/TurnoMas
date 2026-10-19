/**
 * Suscripciones SaaS vía Preapproval de MercadoPago (14.999 ARS/mes).
 *
 * Se crea una suscripción **sin plan asociado** en estado `pending` y se
 * comparte su `init_point`: el pagador completa el checkout eligiendo el
 * medio (saldo en cuenta o tarjeta). El `external_reference` lleva el
 * negocio para poder mapear la suscripción en los webhooks. Funciones puras
 * con fetch inyectable para tests sin red. Nunca loguear valores de tokens.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

const MP_API_BASE = "https://api.mercadopago.com";

/** Precio mensual del plan por país (solo AR en ARS, resto en USD). */
export interface PlanPais
{
  readonly monto: number;
  readonly currency: string;
  readonly etiqueta: string;
}

export const PLAN_POR_PAIS: Record<string, PlanPais> = {
  ar: { monto: 14999, currency: "ARS", etiqueta: "$ 14.999 ARS/mes" },
  mx: { monto: 15, currency: "USD", etiqueta: "U$S 15 USD/mes" },
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
 * Resuelve el monto y la moneda del plan según el país del negocio.
 *
 * Overrides de monto: `MP_PLAN_ARS` y `MP_PLAN_USD`.
 */
export function resolverPlanPais(pais: string | null, env: EnvRecord = process.env): PlanPais
{
  const codigo = (pais ?? "").trim().toLowerCase();

  if (codigo === "ar")
  {
    const monto = leerMontoEnv(env, "MP_PLAN_ARS") ?? PLAN_POR_PAIS.ar.monto;

    return { ...PLAN_POR_PAIS.ar, monto };
  }

  const monto = leerMontoEnv(env, "MP_PLAN_USD") ?? PLAN_POR_PAIS.mx.monto;

  return { ...PLAN_POR_PAIS.mx, monto };
}

export interface PreapprovalInput
{
  readonly negocioId: string;
  readonly payerEmail: string;
  readonly backUrl: string;
  readonly monto: number;
  readonly currency: string;
  readonly platformToken: string;
  readonly notificationUrl?: string | null;
}

export interface PreapprovalCreada
{
  readonly id: string;
  readonly initPoint: string;
  readonly status: string;
}

export interface PreapprovalEstado
{
  readonly id: string;
  readonly status: string;
  readonly externalReference: string | null;
  readonly payerEmail: string | null;
  readonly initPoint: string | null;
  readonly nextPaymentDate: string | null;
}

/** Resumen de un preapproval listado por búsqueda (para reconciliación). */
export interface PreapprovalResumen
{
  readonly id: string;
  readonly status: string;
  readonly externalReference: string | null;
  readonly initPoint: string | null;
  readonly lastModified: string | null;
  readonly nextPaymentDate: string | null;
}

export interface CobroSuscripcion
{
  readonly id: string;
  readonly status: string;
  readonly payerEmail: string | null;
  readonly preapprovalId: string | null;
  readonly externalReference: string | null;
  readonly paymentId: string | null;
  readonly paymentStatus: string | null;
  readonly montoCents: number | null;
  readonly currency: string | null;
  readonly fecha: string | null;
}

/**
 * Convierte el monto de una cuota a centavos enteros.
 *
 * MercadoPago expone `transaction_amount` como string decimal (ej. "14999.00")
 * o número. Se redondea a centavos para guardarlo con la misma convención que
 * `turnos.monto_total`. Null si falta o no es numérico.
 *
 * @param valor `transaction_amount` crudo de MercadoPago.
 * @return Monto en centavos o null si no es parseable.
 */
export function parsearMontoCentavos(valor: unknown): number | null
{
  if (typeof valor !== "string" && typeof valor !== "number")
  {
    return null;
  }

  const numero = typeof valor === "number" ? valor : Number(valor.trim());

  if (!Number.isFinite(numero) || numero < 0)
  {
    return null;
  }

  return Math.round(numero * 100);
}

/**
 * Calcula el fin del período pago sumando un mes a la fecha del cobro.
 *
 * Respaldo local cuando MercadoPago no informa `next_payment_date`: la cuota
 * aprobada cubre el mes siguiente. Devuelve ISO UTC o null si la fecha es
 * inválida.
 *
 * @param fecha Cobro aprobado (`debit_date`/`date_created`) en ISO 8601.
 * @return Fin del período en ISO UTC o null.
 */
export function primerVencimiento(fecha: string | null): string | null
{
  if (fecha === null)
  {
    return null;
  }

  const cobro = new Date(fecha);

  if (Number.isNaN(cobro.getTime()))
  {
    return null;
  }

  cobro.setUTCMonth(cobro.getUTCMonth() + 1);

  return cobro.toISOString();
}

export interface PreapprovalPorEmail
{
  readonly id: string;
  readonly externalReference: string | null;
}

type FetchFn = typeof fetch;

/**
 * Error de la API de MercadoPago que conserva el status HTTP.
 *
 * Permite distinguir un `404` (recurso que no existe para el token, p. ej.
 * un preapproval huérfano) de un error transitorio (`5xx`/red) y decidir si
 * conviene que MP reintente la entrega.
 */
export class MpHttpError extends Error
{
  readonly status: number;

  /**
   * @param mensaje Descripción legible del fallo (sin datos sensibles).
   * @param status Código HTTP devuelto por MercadoPago.
   */
  constructor(mensaje: string, status: number)
  {
    super(mensaje);
    this.name = "MpHttpError";
    this.status = status;
  }
}

/** Arma el error de MP incluyendo status y detalle para diagnóstico. */
async function errorMp(response: Response, mensaje: string): Promise<MpHttpError>
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

  const sufijo = detalle.length > 0 ? `: ${detalle}` : "";

  return new MpHttpError(
    `${mensaje} (HTTP ${response.status})${sufijo}.`,
    response.status,
  );
}

/**
 * Devuelve el primer valor que sea un string no vacío, o null.
 *
 * @param valores Valores candidatos evaluados en orden.
 * @return El primer string no vacío, o null si ninguno califica.
 */
function primerTexto(...valores: readonly unknown[]): string | null
{
  for (const valor of valores)
  {
    if (typeof valor === "string" && valor.length > 0)
    {
      return valor;
    }
  }

  return null;
}

/**
 * Convierte un ID numérico o de texto a string, o null si no aplica.
 *
 * @param valor Valor recibido desde la API de MercadoPago.
 * @return El ID como string, o null si no es string ni número.
 */
function idComoTexto(valor: unknown): string | null
{
  if (typeof valor === "string")
  {
    return valor;
  }

  if (typeof valor === "number")
  {
    return String(valor);
  }

  return null;
}

/**
 * Crea la suscripción de un negocio sin plan, en estado `pending`.
 *
 * MP devuelve un `init_point` para que el pagador complete el checkout
 * eligiendo el medio (saldo en cuenta o tarjeta). El `external_reference`
 * lleva el ID del negocio para mapear la suscripción en los webhooks.
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
      reason: "TurnoMas - Plan mensual",
      external_reference: input.negocioId,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.monto,
        currency_id: input.currency,
      },
      back_url: input.backUrl,
      notification_url: input.notificationUrl ?? undefined,
      status: "pending",
    }),
  });

  if (!response.ok)
  {
    throw await errorMp(response, "No se pudo crear la suscripción en MercadoPago");
  }

  const data = (await response.json()) as { id?: unknown; init_point?: unknown; status?: unknown };

  if (typeof data.id !== "string" || typeof data.init_point !== "string")
  {
    throw new TypeError("Respuesta inválida de MercadoPago al crear la suscripción.");
  }

  return {
    id: data.id,
    initPoint: data.init_point,
    status: typeof data.status === "string" ? data.status : "pending",
  };
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
    throw new MpHttpError(`No se pudo consultar la suscripción: ${response.status}`, response.status);
  }

  const data = (await response.json()) as {
    id?: unknown; status?: unknown; external_reference?: unknown;
    payer_email?: unknown; init_point?: unknown; next_payment_date?: unknown;
  };

  return {
    id: typeof data.id === "string" ? data.id : preapprovalId,
    status: typeof data.status === "string" ? data.status : "unknown",
    externalReference: typeof data.external_reference === "string" ? data.external_reference : null,
    payerEmail: typeof data.payer_email === "string" ? data.payer_email : null,
    initPoint: typeof data.init_point === "string" ? data.init_point : null,
    nextPaymentDate: typeof data.next_payment_date === "string" ? data.next_payment_date : null,
  };
}

/**
 * Lista los preapprovals de la cuenta plataforma filtrando por estado.
 *
 * `external_reference` no es un parámetro de búsqueda de MP, así que el
 * llamador filtra en memoria por negocio. Pensado para reconciliación.
 */
export async function buscarPreapprovalsPorEstado(
  status: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<PreapprovalResumen[]>
{
  const params = new URLSearchParams({ status, limit: "50" });
  const response = await fetchFn(`${MP_API_BASE}/preapproval/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${platformToken}` },
  });

  if (!response.ok)
  {
    throw new MpHttpError(`No se pudieron listar las suscripciones: ${response.status}`, response.status);
  }

  const data = (await response.json()) as { results?: unknown };
  const results = Array.isArray(data.results) ? data.results : [];

  return results.flatMap((raw) =>
  {
    if (typeof raw !== "object" || raw === null)
    {
      return [];
    }

    const fila = raw as Record<string, unknown>;

    if (typeof fila.id !== "string")
    {
      return [];
    }

    const modificado = typeof fila.last_modified === "string" ? fila.last_modified : null;
    const creado = typeof fila.date_created === "string" ? fila.date_created : null;

    return [{
      id: fila.id,
      status: typeof fila.status === "string" ? fila.status : "unknown",
      externalReference: typeof fila.external_reference === "string" ? fila.external_reference : null,
      initPoint: typeof fila.init_point === "string" ? fila.init_point : null,
      lastModified: modificado ?? creado,
      nextPaymentDate: typeof fila.next_payment_date === "string" ? fila.next_payment_date : null,
    }];
  });
}

export interface ActualizarMontoInput
{
  readonly preapprovalId: string;
  readonly monto: number;
  readonly currency: string;
  readonly platformToken: string;
}

/**
 * Actualiza el monto recurrente de una suscripción existente.
 *
 * MercadoPago aplica el nuevo `transaction_amount` a los próximos cobros, no
 * al período ya facturado. Sirve tanto para aplicar una promo como para
 * restaurar el precio base al vencer, sin que el pagador reautorice.
 *
 * @param input Preapproval, monto en unidades de la moneda y token de plataforma.
 * @param fetchFn Fetch inyectable para tests.
 * @throws RangeError Cuando el monto o el ID no son válidos.
 * @throws MpHttpError Cuando MercadoPago rechaza la actualización.
 */
export async function actualizarMontoPreapproval(
  input: ActualizarMontoInput,
  fetchFn: FetchFn = fetch,
): Promise<void>
{
  if (input.preapprovalId.trim().length === 0)
  {
    throw new RangeError("El preapproval es obligatorio.");
  }

  if (!Number.isInteger(input.monto) || input.monto <= 0)
  {
    throw new RangeError("El monto debe ser un entero positivo.");
  }

  if (input.currency.trim().length === 0)
  {
    throw new RangeError("La moneda es obligatoria.");
  }

  const response = await fetchFn(`${MP_API_BASE}/preapproval/${input.preapprovalId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${input.platformToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auto_recurring: {
        transaction_amount: input.monto,
        currency_id: input.currency,
      },
    }),
  });

  if (!response.ok)
  {
    throw await errorMp(response, "No se pudo actualizar el monto de la suscripción");
  }
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
    throw new MpHttpError("No se pudo cancelar la suscripción en MercadoPago.", response.status);
  }
}

/**
 * Consulta una cuota recurrente (authorized payment) de la suscripción.
 *
 * El `data.id` del webhook `subscription_authorized_payment` es el ID de un
 * pago autorizado (cuota), no un pago normal: se consulta con
 * `GET /authorized_payments/{id}` (el mismo ID con `/v1/payments/{id}`
 * responde 404). La respuesta trae `preapproval_id` y `external_reference`
 * para mapear el cobro al negocio, más el `payment` real con su estado.
 */
export async function consultarCobroSuscripcion(
  paymentId: string,
  platformToken: string,
  fetchFn: FetchFn = fetch,
): Promise<CobroSuscripcion>
{
  const response = await fetchFn(`${MP_API_BASE}/authorized_payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${platformToken}` },
  });

  if (!response.ok)
  {
    throw new MpHttpError(`No se pudo consultar el cobro de suscripción: ${response.status}`, response.status);
  }

  const data = (await response.json()) as {
    id?: unknown;
    status?: unknown;
    external_reference?: unknown;
    preapproval_id?: unknown;
    payer?: { email?: unknown } | null;
    payment?: { id?: unknown; status?: unknown } | null;
    transaction_amount?: unknown;
    currency_id?: unknown;
    debit_date?: unknown;
    date_created?: unknown;
  };

  const pago = data.payment ?? null;
  const fecha = primerTexto(data.debit_date, data.date_created);

  return {
    id: idComoTexto(data.id) ?? paymentId,
    status: typeof data.status === "string" ? data.status : "unknown",
    payerEmail: primerTexto(data.payer?.email),
    preapprovalId: typeof data.preapproval_id === "string" ? data.preapproval_id : null,
    externalReference: typeof data.external_reference === "string" ? data.external_reference : null,
    paymentId: idComoTexto(pago?.id),
    paymentStatus: typeof pago?.status === "string" ? pago.status : null,
    montoCents: parsearMontoCentavos(data.transaction_amount),
    currency: typeof data.currency_id === "string" ? data.currency_id : null,
    fecha,
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
