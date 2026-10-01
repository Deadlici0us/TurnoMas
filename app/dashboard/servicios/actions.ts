"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { validarServicio } from "@/lib/servicios/validation";
import type { ServicioInput } from "@/lib/servicios/validation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

function exigirNumeroCrudo(valor: FormDataEntryValue | null): number
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    throw new RangeError("Completá todos los datos numéricos del servicio.");
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero))
  {
    throw new RangeError("Los datos numéricos del servicio tienen que ser enteros.");
  }

  return numero;
}

/** Crea o actualiza un servicio del negocio del dueño autenticado. */
export async function guardarServicio(servicioId: string | null, formData: FormData): Promise<void>
{
  const promoCruda = formData.get("precioPromocional");
  const senaRequerida = formData.get("senaRequerida") === "on";
  const senaCruda = formData.get("senaPorcentaje");

  const servicio = validarServicio({
    nombre: formData.get("nombre"),
    duracionMin: exigirNumeroCrudo(formData.get("duracionMin")),
    precioBase: exigirNumeroCrudo(formData.get("precioBase")),
    precioPromocional: promoCruda === null || String(promoCruda).trim().length === 0
      ? null
      : exigirNumeroCrudo(promoCruda),
    promoActiva: formData.get("promoActiva"),
    senaRequerida: formData.get("senaRequerida"),
    senaPorcentaje: !senaRequerida || senaCruda === null || String(senaCruda).trim().length === 0
      ? 0
      : exigirNumeroCrudo(senaCruda),
    remarketingActivo: formData.get("remarketingActivo"),
    remarketingDias: (() =>
    {
      const cruda = formData.get("remarketingDias");

      if (cruda === null || String(cruda).trim().length === 0)
      {
        return null;
      }

      return exigirNumeroCrudo(cruda);
    })(),
  } satisfies ServicioInput);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar servicios.");
  }

  // El dueño demo está permitido si está en modo editable (ej: local).
  // Si necesitas que la demo sea exclusivamente una sandbox protegida, podrías
  // activar un segundo controlador más adelante (ej: readOnlyForDemo).

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const fila = {
    negocio_id: negocioId,
    nombre: servicio.nombre,
    duracion_min: servicio.duracionMin,
    precio_base: servicio.precioBase,
    precio_promocional: servicio.precioPromocional,
    sena_requerida: servicio.senaRequerida,
    sena_porcentaje: servicio.senaPorcentaje,
    remarketing: servicio.remarketingActivo,
    remarketing_dias: servicio.remarketingDias,
  };

  const { error } = servicioId === null
    ? await admin.from("servicios").insert(fila)
    : await admin.from("servicios").update(fila).eq("id", servicioId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos guardar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}

/** Elimina un servicio sin turnos del negocio del dueño autenticado. */
export async function eliminarServicio(servicioId: string): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar servicios.");
  }

  // Si querés forzar que el dueño demo no pueda eliminar servicios, podés volver a llamar a assertDuenoEditable.
  // Por ahora, mantenerlo editable.

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("servicios").delete()
    .eq("id", servicioId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    if (error.code === "23503")
    {
      throw new Error("No se puede eliminar porque tiene turnos asociados. Desactivalo en su lugar.");
    }

    throw new Error("No pudimos eliminar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}

/** Activa o desactiva un servicio del negocio del dueño autenticado. */
export async function cambiarEstadoServicio(servicioId: string, activo: boolean): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar servicios.");
  }

  // Mantenerlo editable para la demo también.

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("servicios").update({ activo })
    .eq("id", servicioId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos actualizar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}
