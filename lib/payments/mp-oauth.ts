/**
 * Ayudas puras para el OAuth de MercadoPago por negocio (señas delegadas).
 *
 * Flujo: el dueño pulsa Conectar → `/api/integrations/mercadopago/authorize`
 * redirige a MP con `platform_id=mp` → MP devuelve `code` a
 * `/api/integrations/mercadopago/callback` → se canjea por `access_token`
 * (+ `refresh_token`, válido 180 días) y se guarda en `negocio_secretos`.
 * Las notificaciones llegan solas: webhook a nivel aplicación de MP +
 * `notification_url` por preferencia. Nunca loguear valores de tokens.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

export const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";
export const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";
export const MP_CALLBACK_PATH = "/api/integrations/mercadopago/callback";

export interface MpTokens
{
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly userId: string | null;
}

type FetchFn = typeof fetch;

/** Resuelve la base pública (env o origen del request como fallback). */
export function resolveMpBaseUrl(requestOrigin: string | null, env: EnvRecord = process.env): string | null
{
  const publicUrl = readEnv("NEXT_PUBLIC_APP_URL", env);

  if (publicUrl !== null)
  {
    return stripTrailingSlashes(publicUrl);
  }

  const vercelUrl = readEnv("VERCEL_URL", env);

  if (vercelUrl !== null)
  {
    return `https://${stripTrailingSlashes(vercelUrl)}`;
  }

  if (requestOrigin !== null && requestOrigin.trim().length > 0)
  {
    return stripTrailingSlashes(requestOrigin);
  }

  return null;
}

/** URL de callback absoluta para registrar en el panel de la app de MP. */
export function buildMpCallbackUrl(requestOrigin: string | null, env: EnvRecord = process.env): string | null
{
  const base = resolveMpBaseUrl(requestOrigin, env);

  return base === null ? null : `${base}${MP_CALLBACK_PATH}`;
}

export interface MpState
{
  readonly negocioId: string;
  readonly next: string | null;
}

/**
 * Sanea un destino post-OAuth: solo rutas internas (`/...`, sin `//`).
 *
 * @param next Destino crudo o null.
 * @return Destino seguro o null.
 */
export function sanearNext(next: string | null): string | null
{
  if (next === null)
  {
    return null;
  }

  const value = next.trim();

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
  {
    return null;
  }

  return value;
}

/**
 * Codifica el `state` de OAuth (negocio + destino) en base64url.
 *
 * @param state Negocio y destino post-OAuth.
 * @return State opaco para la URL de autorización.
 */
export function codificarMpState(state: MpState): string
{
  return Buffer.from(JSON.stringify({ n: state.negocioId, x: state.next }), "utf8")
    .toString("base64url");
}

/**
 * Decodifica y valida el `state` de OAuth.
 *
 * Acepta el formato codificado actual; los `state` viejos (negocio plano)
 * se rechazan para no mezclar flujos.
 *
 * @param state State crudo del callback.
 * @return Negocio y destino, o null si es inválido.
 */
export function decodificarMpState(state: string): MpState | null
{
  try
  {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      n?: unknown; x?: unknown;
    };

    if (typeof parsed.n !== "string" || parsed.n.trim().length === 0)
    {
      return null;
    }

    return {
      negocioId: parsed.n,
      next: typeof parsed.x === "string" ? sanearNext(parsed.x) : null,
    };
  }
  catch
  {
    return null;
  }
}

/** URL de autorización de MP con `platform_id=mp` y `state` codificado. */
export function buildMpAuthorizeUrl(input: {
  readonly clientId: string;
  readonly callbackUrl: string;
  readonly state: string;
}): string
{
  const params = new URLSearchParams({
    client_id: input.clientId,
    response_type: "code",
    platform_id: "mp",
    state: input.state,
    redirect_uri: input.callbackUrl,
  });

  return `${MP_AUTH_URL}?${params.toString()}`;
}

/** Canjea `code` por tokens (inyectable para tests sin red). */
export async function exchangeMpCodeForTokens(
  input: { readonly code: string; readonly clientId: string; readonly clientSecret: string; readonly redirectUri: string },
  fetchFn: FetchFn = fetch,
): Promise<MpTokens>
{
  const response = await fetchFn(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
  });

  if (!response.ok)
  {
    throw new Error("MercadoPago rechazó el código de autorización. Probá conectar de nuevo.");
  }

  const data = (await response.json()) as {
    access_token?: unknown; refresh_token?: unknown; user_id?: unknown;
  };

  if (typeof data.access_token !== "string" || data.access_token.length === 0)
  {
    throw new Error("Respuesta inválida de MercadoPago al conectar la cuenta.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    userId: typeof data.user_id === "number" || typeof data.user_id === "string"
      ? String(data.user_id)
      : null,
  };
}

/** Renueva el `access_token` con el `refresh_token` guardado (sin intervención). */
export async function refreshMpAccessToken(
  input: { readonly refreshToken: string; readonly clientId: string; readonly clientSecret: string },
  fetchFn: FetchFn = fetch,
): Promise<MpTokens>
{
  const response = await fetchFn(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    }),
  });

  if (!response.ok)
  {
    throw new Error("La conexión con MercadoPago fue revocada. Conectá de nuevo.");
  }

  const data = (await response.json()) as {
    access_token?: unknown; refresh_token?: unknown; user_id?: unknown;
  };

  if (typeof data.access_token !== "string" || data.access_token.length === 0)
  {
    throw new Error("Respuesta inválida de MercadoPago al renovar la conexión.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : input.refreshToken,
    userId: typeof data.user_id === "number" || typeof data.user_id === "string"
      ? String(data.user_id)
      : null,
  };
}
