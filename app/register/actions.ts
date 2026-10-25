"use server";

import { redirect } from "next/navigation";

import { withRedirectAction } from "@/lib/actions/with-redirect-action";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Registra al profesional con Supabase Auth. */
async function registerInterno(formData: FormData): Promise<void>
{
  const businessCrudo = formData.get("business");
  const business = (typeof businessCrudo === "string" ? businessCrudo : "").trim();
  const emailCrudo = formData.get("email");
  const email = (typeof emailCrudo === "string" ? emailCrudo : "").trim();
  const passwordCrudo = formData.get("password");
  const password = typeof passwordCrudo === "string" ? passwordCrudo : "";

  if (business.length < 2 || email.length === 0 || password.length < 6)
  {
    redirect("/register?error=datos");
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

/** Acción de registro con redirección ante errores inesperados. */
export const register = withRedirectAction("register", registerInterno, "/register?error=inesperado");
