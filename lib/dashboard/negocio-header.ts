/**
 * Identidad del negocio para el header global (avatar + nombre).
 *
 * Consulta liviana: solo `nombre` y `logo_url` del negocio del dueño.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sanitizeUrlExterna } from "@/lib/validation/url";

export interface NegocioHeader
{
  readonly nombre: string;
  readonly logoUrl: string | null;
}

/** Lee el usuario de la sesión Supabase sin lanzar si falta config. */
async function leerSesion(): Promise<{ userId: string | null }>
{
  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return { userId: user?.id ?? null };
  }
  catch
  {
    return { userId: null };
  }
}

/** Busca nombre y logo del negocio del dueño (null sin fila o ante error). */
async function consultarNegocio(userId: string): Promise<NegocioHeader | null>
{
  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("negocios")
      .select("nombre, logo_url")
      .eq("duenio_id", userId)
      .maybeSingle();

    if (data === null)
    {
      return null;
    }

    const row = data as { nombre?: unknown; logo_url?: unknown };
    const nombre = typeof row.nombre === "string" ? row.nombre : "";
    // Saneo XSS: el logo se usa como `src`; solo se permiten http(s).
    const logo = sanitizeUrlExterna(row.logo_url);

    return { nombre, logoUrl: logo };
  }
  catch
  {
    return null;
  }
}

/**
 * Resuelve la identidad del negocio para el header.
 *
 * @return Nombre y logo del negocio, o null si no hay negocio.
 */
export async function getNegocioHeader(): Promise<NegocioHeader | null>
{
  const { userId } = await leerSesion();

  if (userId === null)
  {
    return null;
  }

  return consultarNegocio(userId);
}
