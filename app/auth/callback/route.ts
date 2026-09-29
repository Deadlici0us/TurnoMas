/**
 * Callback OAuth de Supabase Auth (login social con Google).
 *
 * Supabase redirige aquí con `?code=...`: se intercambia por sesión y se
 * deriva al destino inteligente (dashboard con negocio, onboarding sin él).
 * El parámetro `next` solo acepta rutas internas (ver `sanitizeNextPath`).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { resolvePostOAuthPath, sanitizeNextPath } from "@/lib/auth/oauth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Completa el flujo OAuth y redirige al destino post-login.
 *
 * @param request Request con `code` y `next` opcional.
 * @return Redirect a dashboard, onboarding o login con error.
 */
export async function GET(request: NextRequest)
{
  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const oauthError = new URL("/login?error=oauth", url.origin);

  if (resolveAuthMode() === "demo")
  {
    return NextResponse.redirect(new URL(next ?? "/dashboard", url.origin));
  }

  const code = url.searchParams.get("code");

  if (code === null || code.trim().length === 0)
  {
    return NextResponse.redirect(oauthError);
  }

  let supabase: Awaited<ReturnType<typeof getSupabaseServer>>;

  try
  {
    supabase = await getSupabaseServer();
  }
  catch
  {
    return NextResponse.redirect(oauthError);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError !== null)
  {
    return NextResponse.redirect(oauthError);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    return NextResponse.redirect(new URL("/login?error=sesion", url.origin));
  }

  const hasBusiness = await hasNegocio(user.id, supabase);

  return NextResponse.redirect(new URL(next ?? resolvePostOAuthPath(hasBusiness), url.origin));
}

/**
 * Indica si el dueño ya tiene fila en `negocios`.
 *
 * @param userId Id autenticado de Supabase Auth.
 * @param supabase Cliente de servidor con la sesión del usuario.
 * @return Verdadero cuando existe negocio, falso en cualquier duda.
 */
async function hasNegocio(
  userId: string,
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
): Promise<boolean>
{
  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("negocios").select("id").eq("duenio_id", userId).maybeSingle();

    return data !== null;
  }
  catch
  {
    // Sin service key (local) u otro fallo: se intenta con el cliente de sesión.
  }

  try
  {
    const { data } = await supabase.from("negocios").select("id").eq("duenio_id", userId).maybeSingle();

    return data !== null;
  }
  catch
  {
    return false;
  }
}
