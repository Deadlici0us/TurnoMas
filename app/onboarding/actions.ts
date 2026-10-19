"use server";

import { redirect } from "next/navigation";

import { resolveAuthMode, buildOnboardingResult } from "@/lib/auth/auth-mode";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { DAY_ORDER } from "@/lib/staff/schedule";
import { validarHorariosStaff } from "@/lib/staff/validation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

/**
 * Lee un campo de texto del formulario y lo normaliza sin espacios extremos.
 *
 * @param formData Formulario enviado por el cliente.
 * @param campo Nombre del campo a leer.
 * @return Valor de texto recortado, o cadena vacía si no es texto.
 */
function leerTexto(formData: FormData, campo: string): string
{
  const crudo = formData.get(campo);

  return (typeof crudo === "string" ? crudo : "").trim();
}

/**
 * Recolecta y valida los horarios de staff enviados en el formulario.
 *
 * @param formData Formulario enviado por el cliente.
 * @return Horarios normalizados, o null si no se cargó ningún rango.
 */
function horariosDeFormulario(formData: FormData): Record<string, string[]> | null
{
  const crudos: Record<string, unknown> = {};

  for (const day of DAY_ORDER)
  {
    crudos[day] = leerTexto(formData, day);
  }

  const normalizados = validarHorariosStaff(crudos);

  return DAY_ORDER.some((day) => normalizados[day].length > 0) ? normalizados : null;
}

/**
 * Crea el perfil del negocio (paso 1 del onboarding).
 * En Vercel persiste en `negocios` y sigue al paso 2 (conectar MercadoPago,
 * obligatorio para cobrar señas); en local redirige al dashboard demo.
 */
export async function createBusiness(formData: FormData): Promise<void>
{
  const nombre = leerTexto(formData, "nombre");
  const pais = leerTexto(formData, "pais");
  const timezone = resolverTimezoneNegocio({
    timezone: leerTexto(formData, "timezone"),
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
    horarios = horariosDeFormulario(formData);
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
