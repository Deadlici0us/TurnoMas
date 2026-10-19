/**
 * Token de cancelación del cliente (stateless).
 *
 * Link mágico HMAC-SHA256 con expiración = inicio del turno: se envía por
 * email (Resend) y WhatsApp (wa.me) y vuelve como `?token=`. Solo quien
 * recibe el link puede cancelar. Sin tabla nueva: el payload viaja firmado.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Tolerancia de reloj al comparar expiración (5 minutos). */
export const TOLERANCIA_EXPIRACION_MS = 5 * 60_000;

export interface TokenCancelacionPayload
{
  readonly turnoId: string;
  readonly clienteId: string;
  readonly exp: number;
}

export interface FirmarTokenCancelacionInput
{
  readonly turnoId: string;
  readonly clienteId: string;
  readonly inicio: Date;
}

function aBase64Url(valor: string): string
{
  return Buffer.from(valor, "utf8").toString("base64url");
}

function deBase64Url(valor: string): string
{
  return Buffer.from(valor, "base64url").toString("utf8");
}

/**
 * Firma el token de cancelación con expiración = inicio del turno.
 *
 * @param input Turno, cliente e inicio (expiración).
 * @param secreto Secreto HMAC (CANCELACION_SECRET).
 * @return Token `cuerpo.firma`.
 */
export function firmarTokenCancelacion(input: FirmarTokenCancelacionInput, secreto: string): string
{
  const payload: TokenCancelacionPayload = {
    turnoId: input.turnoId,
    clienteId: input.clienteId,
    exp: input.inicio.getTime(),
  };
  const cuerpo = aBase64Url(JSON.stringify(payload));
  const firma = createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64url");

  return `${cuerpo}.${firma}`;
}

/**
 * Verifica firma, binding y expiración; lanza en español si no es válido.
 *
 * @param token Token `cuerpo.firma`.
 * @param secreto Secreto HMAC.
 * @param ahora Ahora para comparar expiración.
 * @param turnoIdEsperado Turno de la URL (binding anti-reuso).
 * @return Payload verificado.
 */
export function verificarTokenCancelacion(
  token: string,
  secreto: string,
  ahora: Date,
  turnoIdEsperado?: string,
): TokenCancelacionPayload
{
  const [cuerpo = "", firma = ""] = token.split(".");

  if (cuerpo.length === 0 || firma.length === 0)
  {
    throw new Error("El link de cancelación no es válido. Pedí uno nuevo.");
  }

  const esperada = createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64url");
  const a = Buffer.from(firma, "utf8");
  const b = Buffer.from(esperada, "utf8");

  if (a.length !== b.length || !timingSafeEqual(a, b))
  {
    throw new Error("El link de cancelación no es válido. Pedí uno nuevo.");
  }

  let payload: TokenCancelacionPayload;

  try
  {
    payload = JSON.parse(deBase64Url(cuerpo)) as TokenCancelacionPayload;
  }
  catch
  {
    throw new Error("El link de cancelación no es válido. Pedí uno nuevo.");
  }

  if (typeof payload.turnoId !== "string" || typeof payload.clienteId !== "string"
    || typeof payload.exp !== "number")
  {
    throw new TypeError("El link de cancelación no es válido. Pedí uno nuevo.");
  }

  if (typeof turnoIdEsperado === "string" && payload.turnoId !== turnoIdEsperado)
  {
    throw new Error("El link de cancelación no es válido para este turno.");
  }

  if (payload.exp + TOLERANCIA_EXPIRACION_MS < ahora.getTime())
  {
    throw new Error("El link de cancelación caducó (válido hasta el inicio del turno).");
  }

  return payload;
}

/**
 * Construye el link público de cancelación.
 *
 * @param base Base pública (NEXT_PUBLIC_APP_URL).
 * @param turnoId ID del turno.
 * @param token Token firmado.
 * @return URL `/cancelar/[turnoId]?token=`.
 */
export function construirLinkCancelacion(base: string, turnoId: string, token: string): string
{
  const recortada = base.endsWith("/") ? base.slice(0, -1) : base;

  return `${recortada}/cancelar/${turnoId}?token=${encodeURIComponent(token)}`;
}
