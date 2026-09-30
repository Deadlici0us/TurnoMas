/**
 * Ayudas puras para el OAuth de Google Calendar por negocio (Módulo 3).
 *
 * Flujo: el dueño pulsa Conectar → `/api/integrations/google/authorize`
 * redirige a Google con `access_type=offline` → Google devuelve `code` a
 * `/api/integrations/google/callback` → se canjea por `refresh_token` y se
 * guarda en `negocio_secretos` (server-only). Sync unidireccional App → GCal.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_CALLBACK_PATH = "/api/integrations/google/callback";

export interface GoogleTokens
{
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresIn: number | null;
}

type FetchFn = typeof fetch;

/** Resuelve la base pública (env o origen del request como fallback). */
export function resolveGoogleBaseUrl(requestOrigin: string | null, env: EnvRecord = process.env): string | null
{
  const publicUrl = readEnv("NEXT_PUBLIC_APP_URL", env);

  if (publicUrl !== null)
  {
    return publicUrl.replace(/\/+$/, "");
  }

  const vercelUrl = readEnv("VERCEL_URL", env);

  if (vercelUrl !== null)
  {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  if (requestOrigin !== null && requestOrigin.trim().length > 0)
  {
    return requestOrigin.replace(/\/+$/, "");
  }

  return null;
}

/** URL de callback absoluta para registrar en Google Cloud Console. */
export function buildGoogleCallbackUrl(requestOrigin: string | null, env: EnvRecord = process.env): string | null
{
  const base = resolveGoogleBaseUrl(requestOrigin, env);

  return base === null ? null : `${base}${GOOGLE_CALLBACK_PATH}`;
}

/** URL de autorización con `offline` para obtener `refresh_token`. */
export function buildGoogleAuthorizeUrl(input: {
  readonly clientId: string;
  readonly callbackUrl: string;
  readonly state: string;
}): string
{
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.callbackUrl,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: input.state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Canjea `code` por tokens (inyectable para tests sin red). */
export async function exchangeCodeForTokens(
  input: { readonly code: string; readonly clientId: string; readonly clientSecret: string; readonly redirectUri: string },
  fetchFn: FetchFn = fetch,
): Promise<GoogleTokens>
{
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok)
  {
    throw new Error("Google rechazó el código de autorización. Probá conectar de nuevo.");
  }

  const data = (await response.json()) as {
    access_token?: unknown; refresh_token?: unknown; expires_in?: unknown;
  };

  if (typeof data.access_token !== "string" || data.access_token.length === 0)
  {
    throw new Error("Respuesta inválida de Google al conectar el calendario.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : null,
  };
}

/** Refresca un `access_token` corto a partir del `refresh_token` guardado. */
export async function refreshAccessToken(
  input: { readonly refreshToken: string; readonly clientId: string; readonly clientSecret: string },
  fetchFn: FetchFn = fetch,
): Promise<string>
{
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok)
  {
    throw new Error("Se venció la conexión con Google. Desconectá y conectá de nuevo.");
  }

  const data = (await response.json()) as { access_token?: unknown };

  if (typeof data.access_token !== "string" || data.access_token.length === 0)
  {
    throw new Error("Respuesta inválida de Google al refrescar el calendario.");
  }

  return data.access_token;
}
