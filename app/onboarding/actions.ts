"use server";

import { redirect } from "next/navigation";

import { resolveAuthMode, buildOnboardingResult } from "@/lib/auth/auth-mode";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Crea el perfil del negocio (paso 1 del onboarding).
 * En Vercel persiste en `negocios`; en local redirige al dashboard demo.
 */
export async function createBusiness(formData: FormData): Promise<void>
{
  const nombre = String(formData.get("nombre") ?? "").trim();
  const pais = String(formData.get("pais") ?? "").trim();

  let url = "";

  try
  {
    url = buildOnboardingResult(pais, nombre).url;
  }
  catch
  {
    redirect("/onboarding?error=datos");
  }

  if (resolveAuthMode() === "demo")
  {
    redirect("/dashboard");
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user)
  {
    redirect("/login?error=sesion");
  }

  // La demo ya tiene negocio: no puede crear otro (además es solo lectura).
  if (isDemoOwner({ userId: user.id, email: user.email ?? null }))
  {
    redirect("/dashboard");
  }

  const slug = url.split("/").pop() ?? "";

  const { error } = await supabase.from("negocios").insert({
    duenio_id: user.id,
    nombre,
    pais: pais.toLowerCase(),
    slug,
  });

  if (error)
  {
    redirect("/onboarding?error=guardado");
  }

  redirect("/dashboard/config?gcal=pending");
}
