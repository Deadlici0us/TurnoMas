/**
 * Cliente Supabase para el navegador (Supabase Auth + DB).
 *
 * La creación es perezosa: el módulo nunca lanza en import/build local
 * sin secrets; solo falla al usarse sin configuración, con mensaje en español.
 */

import { createBrowserClient } from "@supabase/ssr";
import { readEnv } from "@/lib/env/env";

export function getSupabaseBrowser()
{
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (url === null || key === null)
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave pública).");
  }

  return createBrowserClient(url, key);
}
