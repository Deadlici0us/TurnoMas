/**
 * Sesión demo temporal: cookie pública, sin Supabase Auth ni datos en DB.
 *
 * La cuenta demo existe para visualizar el producto. Se identifica por la
 * cookie `session=demo`, por una sesión Supabase heredada con el email/ID demo
 * o por el modo local sin Supabase. En cualquiera de esos casos el dashboard
 * usa el seed en memoria y no ejecuta escrituras.
 */

import { isDemoOwner } from "@/lib/auth/demo-guard";
import { tieneCookieDemo } from "@/lib/auth/demo-cookie";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Resultado de leer la identidad de la request actual. */
export interface DemoSession
{
  readonly esDemo: boolean;
  readonly userId: string | null;
  readonly email: string | null;
}

/**
 * Resuelve si la request actual pertenece a la demo.
 *
 * Prioriza la cookie (sesión temporal pura). Como compatibilidad, reconoce
 * sesiones Supabase heredadas cuyo email o ID correspondan al dueño demo.
 *
 * @return Identidad demo, usuario/email de Supabase y bandera `esDemo`.
 */
export async function leerSesionDemo(): Promise<DemoSession>
{
  if (await tieneCookieDemo())
  {
    return { esDemo: true, userId: null, email: null };
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const email = user?.email ?? null;

    return {
      esDemo: userId !== null && isDemoOwner({ userId, email }),
      userId,
      email,
    };
  }
  catch
  {
    return { esDemo: false, userId: null, email: null };
  }
}

/**
 * Indica si la request actual debe servirse como demo.
 *
 * @return `true` para cookie demo o dueño demo heredado de Supabase.
 */
export async function esSesionDemo(): Promise<boolean>
{
  return (await leerSesionDemo()).esDemo;
}
