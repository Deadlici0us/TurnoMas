"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Inicia sesión: Supabase Auth en Vercel, sesión demo local sin secrets. */
export async function login(formData: FormData): Promise<void>
{
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (email.length === 0 || password.length === 0)
  {
    redirect("/login?error=credenciales");
  }

  if (resolveAuthMode() === "demo")
  {
    (await cookies()).set("session", "demo", { path: "/", maxAge: 60 * 60 * 24 * 7 });

    redirect("/dashboard");
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error)
  {
    redirect("/login?error=credenciales");
  }

  redirect("/dashboard");
}
