/**
 * Firma de QStash (Módulo 5): verifica el JWT `Upstash-Signature`.
 *
 * Función pura para TDD. Sin secretos configurados permite el paso
 * (modo demo/build); con secreto exige JWT HS256 vigente firmado
 * con la clave actual o la siguiente (rotación de Upstash).
 */

export interface FirmaQStashInput
{
  readonly firma: string | null;
  readonly claveActual: string | null;
  readonly claveSiguiente: string | null;
}

function base64urlADecodificado(segmento: string): string | null
{
  try
  {
    const base = segmento.replace(/-/g, "+").replace(/_/g, "/");
    const relleno = "=".repeat((4 - (base.length % 4)) % 4);

    if (typeof atob === "function")
    {
      return atob(base + relleno);
    }

    return Buffer.from(base + relleno, "base64").toString("utf8");
  }
  catch
  {
    return null;
  }
}

async function firmaValida(token: string, secreto: string): Promise<boolean>
{
  const partes = token.split(".");

  if (partes.length !== 3)
  {
    return false;
  }

  const [header, payload, firma] = partes as [string, string, string];
  const payloadJson = base64urlADecodificado(payload);

  if (payloadJson === null)
  {
    return false;
  }

  try
  {
    const claims = JSON.parse(payloadJson) as { exp?: unknown };
    const ahoraSeg = Math.floor(Date.now() / 1000);

    if (typeof claims.exp === "number" && claims.exp <= ahoraSeg)
    {
      return false;
    }
  }
  catch
  {
    return false;
  }

  try
  {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secreto),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const firmaBin = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${payload}`));
    const hex = Array.from(new Uint8Array(firmaBin))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    const firmaNormalizada = firma.trim().toLowerCase();

    if (/^[0-9a-f]+$/.test(firmaNormalizada) && firmaNormalizada.length === hex.length)
    {
      return hex === firmaNormalizada;
    }

    const binario = Uint8Array.from(base64urlADecodificado(firma)?.split("").map((c) => c.charCodeAt(0))
      ?? []);
    const esperada = new Uint8Array(firmaBin);

    if (binario.length !== esperada.length)
    {
      return false;
    }

    let distinto = 0;

    for (let i = 0; i < esperada.length; i += 1)
    {
      distinto |= (binario[i] ?? 0) ^ (esperada[i] ?? 0);
    }

    return distinto === 0;
  }
  catch
  {
    return false;
  }
}

/** Verifica la firma de QStash contra las claves de rotación. */
export async function verificarFirmaQStash(input: FirmaQStashInput): Promise<boolean>
{
  const actual = input.claveActual?.trim() ?? "";
  const siguiente = input.claveSiguiente?.trim() ?? "";

  if (actual.length === 0 && siguiente.length === 0)
  {
    return true;
  }

  if (input.firma === null || input.firma.trim().length === 0)
  {
    return false;
  }

  const token = input.firma.trim();

  if (actual.length > 0 && await firmaValida(token, actual))
  {
    return true;
  }

  if (siguiente.length > 0 && await firmaValida(token, siguiente))
  {
    return true;
  }

  return false;
}
