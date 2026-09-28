"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Registra al profesional: Supabase Auth en Vercel, demo local sin secrets. */
export async function register(formData: FormData): Promise<void>
{
  const business = String(formData.get("business") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (business.length < 2 || email.length === 0 || password.length < 6)
  {
    redirect("/register?error=datos");
  }

  if (resolveAuthMode() === "demo")
  {
    (await cookies()).set("session", "demo", { path: "/", maxAge: 60 * 60 * 24 * 7 });

    redirect("/onboarding");
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { business_name: business } },
  });

  if (error)
  {
    redirect("/register?error=registro");
  }

  redirect("/onboarding");
}
