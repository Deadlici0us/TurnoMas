/**
 * Ayudas puras para el login OAuth con Supabase (Google).
 *
 * Centraliza la resolución de URLs de callback y el destino post-login
 * para que la ruta `app/auth/callback` y el botón cliente compartan
 * la misma lógica testeable sin tocar Supabase.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

const OAUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Resuelve la base pública de la app.
 *
 * @param env Variables de entorno (por defecto `process.env`).
 * @return Base sin barras finales o null sin configuración.
 */
export function resolveAppBaseUrl(env: EnvRecord = process.env): string | null
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

  return null;
}

/**
 * Construye la URL absoluta del callback OAuth.
 *
 * @param env Variables de entorno (por defecto `process.env`).
 * @return URL de callback o null sin base configurada.
 */
export function buildOAuthCallbackUrl(env: EnvRecord = process.env): string | null
{
  const base = resolveAppBaseUrl(env);

  return base === null ? null : `${base}${OAUTH_CALLBACK_PATH}`;
}

/**
 * Decide el destino post-OAuth según si el dueño ya tiene negocio.
 *
 * @param hasBusiness Verdadero cuando existe fila en `negocios`.
 * @return Ruta interna de destino.
 */
export function resolvePostOAuthPath(hasBusiness: boolean): "/dashboard" | "/onboarding"
{
  return hasBusiness ? "/dashboard" : "/onboarding";
}

/**
 * Valida el parámetro `next` para evitar redirects abiertos.
 *
 * @param next Valor crudo del query param.
 * @return Ruta interna segura o null cuando no es confiable.
 */
export function sanitizeNextPath(next: string | null): string | null
{
  if (next === null)
  {
    return null;
  }

  const trimmed = next.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//"))
  {
    return null;
  }

  if (/^\/[a-z]+:/i.test(trimmed))
  {
    return null;
  }

  return trimmed;
}
