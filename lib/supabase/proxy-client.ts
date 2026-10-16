/**
 * Cliente Supabase para el Proxy (middleware) de Next 16.
 *
 * El proxy corre en runtime Node y no tiene acceso a `cookies()` de
 * `next/headers`, así que el adaptador lee/escribe sobre `NextRequest`
 * y `NextResponse`. Devuelve además la respuesta con las cookies de
 * sesión ya refrescadas para que el proxy la propague.
 */

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readEnv } from "@/lib/env/env";

export interface SupabaseProxy
{
  readonly supabase: SupabaseClient;
  /** Respuesta passthrough con cookies de sesión y cabeceras de request. */
  response(): NextResponse;
}

/**
 * Crea el cliente de sesión para usar dentro del proxy.
 *
 * @param request Request entrante del proxy.
 * @param requestHeaders Cabeceras (mutables) que se reenviarán a la app.
 * @return Cliente Supabase y la respuesta passthrough asociada.
 */
export function createSupabaseProxyClient(
  request: NextRequest,
  requestHeaders: Headers,
): SupabaseProxy
{
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (url === null || key === null)
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave pública).");
  }

  let current = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, key,
  {
    cookies:
    {
      getAll()
      {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet)
      {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        current = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => current.cookies.set(name, value, options));
      },
    },
  });

  return {
    supabase,
    response()
    {
      return current;
    },
  };
}
