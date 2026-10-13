"use server";

import { redirect } from "next/navigation";

import { resolveAuthMode, buildOnboardingResult } from "@/lib/auth/auth-mode";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { DAY_ORDER } from "@/lib/staff/schedule";
import { validarHorariosStaff } from "@/lib/staff/validation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

/**
 * Crea el perfil del negocio (paso 1 del onboarding).
 * En Vercel persiste en `negocios` y sigue al paso 2 (conectar MercadoPago,
 * obligatorio para cobrar señas); en local redirige al dashboard demo.
 */
export async function createBusiness(formData: FormData): Promise<void>
{
  const nombreCrudo = formData.get("nombre");
  const nombre = (typeof nombreCrudo === "string" ? nombreCrudo : "").trim();
  const paisCrudo = formData.get("pais");
  const pais = (typeof paisCrudo === "string" ? paisCrudo : "").trim();
  const timezoneCruda = formData.get("timezone");
  const timezone = resolverTimezoneNegocio({
    timezone: typeof timezoneCruda === "string" ? timezoneCruda : "",
    pais,
  });

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

  let horarios: Record<string, string[]> | null = null;

  try
  {
    const crudos: Record<string, unknown> = {};

    for (const day of DAY_ORDER)
    {
      const valor = formData.get(day);

      crudos[day] = typeof valor === "string" ? valor : "";
    }

    const normalizados = validarHorariosStaff(crudos);

    if (DAY_ORDER.some((day) => normalizados[day].length > 0))
    {
      horarios = normalizados;
    }
  }
  catch
  {
    redirect("/onboarding?error=horarios");
  }

  const { error } = await supabase.from("negocios").insert({
    duenio_id: user.id,
    nombre,
    pais: pais.toLowerCase(),
    slug,
    timezone,
    ...(horarios === null ? {} : { horarios }),
  });

  if (error)
  {
    // El dueño ya tiene negocio (re-entrada por register): seguir al dashboard.
    if (error.code === "23505")
    {
      redirect("/dashboard");
    }

    redirect("/onboarding?error=guardado");
  }

  redirect("/onboarding?paso=2");
}
