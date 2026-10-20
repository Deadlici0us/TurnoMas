/**
 * Cliente Supabase con service role (SOLO servidor, bypass RLS).
 *
 * Uso reservado a tareas privilegiadas del servidor (webhooks, crons,
 * panel admin y operaciones que requieren bypass de RLS).
 * Nunca importar desde componentes cliente ni exponer la clave.
 */

import { createClient } from "@supabase/supabase-js";
import { readEnv } from "@/lib/env/env";

export function getSupabaseAdmin()
{
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SECRET_KEY");

  if (url === null || serviceKey === null)
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
