"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from "@/lib/auth/demo-cookie";
import { esCredencialDemo } from "@/lib/auth/demo-credentials";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Inicia sesión: Supabase Auth en Vercel, sesión demo temporal sin DB. */
export async function login(formData: FormData): Promise<void>
{
  const emailCrudo = formData.get("email");
  const email = (typeof emailCrudo === "string" ? emailCrudo : "").trim();
  const passwordCrudo = formData.get("password");
  const password = typeof passwordCrudo === "string" ? passwordCrudo : "";

  if (email.length === 0 || password.length === 0)
  {
    redirect("/login?error=credenciales");
  }

  if (resolveAuthMode() === "demo" || esCredencialDemo(email, password))
  {
    (await cookies()).set(DEMO_COOKIE, DEMO_COOKIE_VALUE, { path: "/", maxAge: 60 * 60 * 24 * 7 });

    redirect("/dashboard");
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

/** Cierra sesión: limpia siempre la cookie demo y luego Supabase si aplica. */
export async function logout(): Promise<void>
{
  (await cookies()).delete(DEMO_COOKIE);

  if (resolveAuthMode() === "demo")
  {
    redirect("/login");
  }

  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();

  redirect("/login");
}
