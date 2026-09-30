/**
 * Eliminación del negocio con confirmación por email (stateless).
 *
 * Sin tabla nueva: el código de 6 dígitos viaja al email del dueño y el
 * token firmado (HMAC-SHA256 + expiración) vuelve desde el cliente como
 * campo oculto. Solo quien lee el email conoce el código.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Texto exacto que el dueño debe escribir para confirmar. */
export const TEXTO_CONFIRMACION_ELIMINACION = "ELIMINAR";

/** Minutos de vigencia del código enviado por email. */
export const MINUTOS_VIGENCIA_CODIGO = 30;

export interface TokenEliminacionPayload
{
  readonly negocioId: string;
  readonly email: string;
  readonly codigoHash: string;
  readonly exp: number;
}

/** Genera un código numérico de 6 dígitos con aleatoriedad criptográfica. */
export function generarCodigoEliminacion(): string
{
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(3));
  const numero = ((bytes[0] ?? 0) * 65_536 + (bytes[1] ?? 0) * 256 + (bytes[2] ?? 0)) % 1_000_000;

  return String(numero).padStart(6, "0");
}

/** SHA-256 del código (lo que viaja en el token, nunca el código). */
export function hashCodigoEliminacion(codigo: string): string
{
  return createHash("sha256").update(codigo, "utf8").digest("hex");
}

/** Compara el código ingresado con el hash del token en tiempo constante. */
export function codigoCoincide(codigo: string, codigoHash: string): boolean
{
  const a = Buffer.from(hashCodigoEliminacion(codigo), "utf8");
  const b = Buffer.from(codigoHash, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

function aBase64Url(valor: string): string
{
  return Buffer.from(valor, "utf8").toString("base64url");
}

function deBase64Url(valor: string): string
{
  return Buffer.from(valor, "base64url").toString("utf8");
}

/** Firma el payload y devuelve `cuerpo.firma` (expiración incluida). */
export function firmarTokenEliminacion(payload: TokenEliminacionPayload, secreto: string): string
{
  const cuerpo = aBase64Url(JSON.stringify(payload));
  const firma = createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64url");

  return `${cuerpo}.${firma}`;
}

/** Verifica firma y expiración; lanza en español si no es válido. */
export function verificarTokenEliminacion(token: string, secreto: string): TokenEliminacionPayload
{
  const [cuerpo = "", firma = ""] = token.split(".");

  if (cuerpo.length === 0 || firma.length === 0)
  {
    throw new Error("El código de confirmación no es válido. Pedí uno nuevo.");
  }

  const esperada = createHmac("sha256", secreto).update(cuerpo, "utf8").digest("base64url");
  const a = Buffer.from(firma, "utf8");
  const b = Buffer.from(esperada, "utf8");

  if (a.length !== b.length || !timingSafeEqual(a, b))
  {
    throw new Error("El código de confirmación no es válido. Pedí uno nuevo.");
  }

  let payload: TokenEliminacionPayload;

  try
  {
    payload = JSON.parse(deBase64Url(cuerpo)) as TokenEliminacionPayload;
  }
  catch
  {
    throw new Error("El código de confirmación no es válido. Pedí uno nuevo.");
  }

  if (typeof payload.exp !== "number" || payload.exp < Date.now())
  {
    throw new Error("El código caducó. Pedí uno nuevo.");
  }

  if (typeof payload.negocioId !== "string" || typeof payload.codigoHash !== "string")
  {
    throw new Error("El código de confirmación no es válido. Pedí uno nuevo.");
  }

  return payload;
}

/** Exige el texto de confirmación exacto (mayúsculas). */
export function validarTextoConfirmacion(texto: string): boolean
{
  if (texto.trim() !== TEXTO_CONFIRMACION_ELIMINACION)
  {
    throw new Error(`Escribí ${TEXTO_CONFIRMACION_ELIMINACION} para confirmar.`);
  }

  return true;
}

/** Enmascara el email para mostrar a dónde se envió el código. */
export function enmascararEmail(email: string): string
{
  const [usuario = "", dominio = ""] = email.split("@");

  if (usuario.length === 0 || dominio.length === 0)
  {
    return "***";
  }

  return `${usuario[0]}***@${dominio}`;
}
