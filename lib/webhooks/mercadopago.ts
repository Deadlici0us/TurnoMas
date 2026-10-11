/**
 * Webhook MercadoPago (Módulo 2/5): parseo y verificación de firma.
 *
 * Funciones puras para TDD. Soporta los formatos que envía MP:
 * type/data.id clásico, action/data.id y topic/resource con URL.
 * La firma x-signature se verifica con HMAC-SHA256 cuando hay secreto.
 */

export interface FirmaMpInput
{
  readonly firma: string | null;
  readonly secreto: string | null;
  readonly pagoId: string;
  readonly timestamp: string;
}

type Payload = Record<string, unknown>;

/** Extrae el ID numérico del pago desde cualquier variante del payload MP. */
export function extraerPagoId(body: unknown): string | null
{
  if (typeof body !== "object" || body === null)
  {
    return null;
  }

  const payload = body as Payload;
  const data = (payload.data ?? null) as Payload | null;
  const rawId = data !== null ? data.id : null;

  if (typeof rawId === "string" && rawId.trim().length > 0)
  {
    return rawId.trim();
  }

  if (typeof rawId === "number" && Number.isFinite(rawId))
  {
    return String(rawId);
  }

  const resource = payload.resource;

  if (typeof resource === "string")
  {
    // Sin regex: el id es el último segmento de la ruta si es todo dígitos.
    const recortado = resource.endsWith("/") ? resource.slice(0, -1) : resource;
    const ultimo = recortado.slice(recortado.lastIndexOf("/") + 1);

    if (ultimo.length > 0 && [...ultimo].every((c) => c >= "0" && c <= "9"))
    {
      return ultimo;
    }
  }

  return null;
}

/** Extrae el tópico del payload (type/topic/action) en minúsculas. */
function extraerTopico(body: unknown): string | null
{
  if (typeof body !== "object" || body === null)
  {
    return null;
  }

  const payload = body as Payload;
  const type = payload.type;
  const topic = payload.topic;

  if (typeof type === "string" && type.length > 0)
  {
    return type.toLowerCase();
  }

  if (typeof topic === "string" && topic.length > 0)
  {
    return topic.toLowerCase();
  }

  if (typeof payload.action === "string" && payload.action.startsWith("payment."))
  {
    return "payment";
  }

  return null;
}

/** Indica si el payload es alta/baja del plan (suscripción SaaS). */
export function esAltaSuscripcion(body: unknown): boolean
{
  return extraerTopico(body) === "subscription_preapproval";
}

/** Indica si el payload es un cobro mensual de suscripción SaaS. */
export function esCobroSuscripcion(body: unknown): boolean
{
  return extraerTopico(body) === "subscription_authorized_payment";
}

/** Indica si el payload parece una notificación de pago (no un ping). */
export function esNotificacionPago(body: unknown): boolean
{
  if (typeof body !== "object" || body === null)
  {
    return false;
  }

  const payload = body as Payload;

  if (payload.type === "payment" || payload.topic === "payment")
  {
    return true;
  }

  return typeof payload.action === "string" && payload.action.startsWith("payment.");
}

/** Verifica la firma x-signature de MP; sin secreto configurado permite el paso. */
export async function verificarFirmaMp(input: FirmaMpInput): Promise<boolean>
{
  if (input.secreto === null || input.secreto.trim().length === 0)
  {
    return true;
  }

  if (input.firma === null || input.firma.trim().length === 0)
  {
    return false;
  }

  const parteV1 = input.firma.split(",").map((p) => p.trim()).find((p) => p.startsWith("v1="));

  if (parteV1 === undefined)
  {
    return false;
  }

  const firmaRecibida = parteV1.slice("v1=".length).trim().toLowerCase();

  if (firmaRecibida.length === 0)
  {
    return false;
  }

  try
  {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(input.secreto),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const manifest = `id:${input.pagoId};ts:${input.timestamp};`;
    const firma = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
    const hex = Array.from(new Uint8Array(firma)).map((b) => b.toString(16).padStart(2, "0")).join("");

    return hex.toLowerCase() === firmaRecibida;
  }
  catch
  {
    return false;
  }
}
