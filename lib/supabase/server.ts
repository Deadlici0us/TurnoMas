/**
 * Cliente Supabase para el servidor (Server Components, Actions y Routes).
 *
 * Compatible con Next 16 (`cookies()` asíncrono). Lectura perezosa de secrets:
 * nunca lanza en import; solo al usarse sin configuración.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { readEnv } from "@/lib/env/env";

export async function getSupabaseServer()
{
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (url === null || key === null)
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave pública).");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll()
      {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet)
      {
        try
        {
          cookiesToSet.forEach(({ name, value, options }) =>
          {
            cookieStore.set(name, value, options);
          });
        }
        catch
        {
          // Ignorado en Server Components de solo lectura.
        }
      },
    },
  });
}
