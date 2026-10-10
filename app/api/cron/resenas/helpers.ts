/**
 * Base pública para construir el link de calificación.
 *
 * Vive fuera de `route.ts` porque Next App Router solo permite exportar
 * handlers (`GET`/`POST`/...) y segment config desde un `route.ts`;
 * cualquier otro export en runtime rompe `next build` con
 * "Invalid segment configuration export detected".
 */

import { readEnv } from "@/lib/env/env";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

/** Base pública para construir el link de calificación. */
export function resolverBaseResena(): string | null
{
  const publica = readEnv("NEXT_PUBLIC_APP_URL");

  if (publica !== null)
  {
    return stripTrailingSlashes(publica);
  }

  const vercel = readEnv("VERCEL_URL");

  return vercel !== null ? `https://${stripTrailingSlashes(vercel)}` : null;
}
