"use server";

import { redirect } from "next/navigation";

import { withRedirectAction } from "@/lib/actions/with-redirect-action";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Inicia sesión con Supabase Auth. */
async function loginInterno(formData: FormData): Promise<void>
{
  const emailCrudo = formData.get("email");
  const email = (typeof emailCrudo === "string" ? emailCrudo : "").trim();
  const passwordCrudo = formData.get("password");
  const password = typeof passwordCrudo === "string" ? passwordCrudo : "";

  if (email.length === 0 || password.length === 0)
  {
    redirect("/login?error=credenciales");
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error)
  {
    redirect("/login?error=credenciales");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user !== null)
  {
    const { data: negocio } = await supabase.from("negocios")
      .select("id").eq("duenio_id", user.id).maybeSingle();

    if (negocio === null)
    {
      redirect("/onboarding");
    }
  }

  redirect("/dashboard");
}

/** Cierra la sesión de Supabase. */
async function logoutInterno(): Promise<void>
{
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();

  redirect("/login");
}

/** Acción de login con redirección ante errores inesperados. */
export const login = withRedirectAction("login", loginInterno, "/login?error=inesperado");

/** Acción de logout con redirección ante errores inesperados. */
export const logout = withRedirectAction("logout", logoutInterno, "/login?error=inesperado");
