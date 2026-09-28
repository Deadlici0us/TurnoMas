"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Entra a la demo: Supabase Auth en Vercel, sesión local sin secrets. */
export async function enterDemo(): Promise<void>
{
  if (resolveAuthMode() === "demo")
  {
    (await cookies()).set("session", "demo", { path: "/", maxAge: 60 * 60 * 24 });

    redirect("/dashboard");
  }

  const { email, password } = getDemoCredentials();
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error)
  {
    redirect("/demo?error=demo");
  }

  redirect("/dashboard");
}
