/**
 * Cliente Supabase para el navegador (Supabase Auth + DB).
 *
 * La creación es perezosa: el módulo nunca lanza en import/build local
 * sin secrets; solo falla al usarse sin configuración, con mensaje en español.
 *
 * Los accesos a `process.env` son estáticos a propósito: Next.js solo
 * incrusta en el bundle del browser referencias literales
 * `process.env.NEXT_PUBLIC_*`. Un acceso dinámico (`env[name]`) no se
 * inlineariza y en el browser `process` no existe (ReferenceError).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

/** Lee las vars públicas con acceso estático para que el bundler las incruste en el cliente. */
function readBrowserEnv(): EnvRecord
{
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseBrowser()
{
  const env = readBrowserEnv();
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", env);
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env);

  if (url === null || key === null)
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave pública).");
  }

  return createBrowserClient(url, key);
}
