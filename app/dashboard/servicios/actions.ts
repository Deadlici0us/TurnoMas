"use server";

import { revalidatePath } from "next/cache";

import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { ValidationError } from "@/lib/errors/validation-error";
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

/**
 * Exige MercadoPago conectado para activar señas (sin fallback a plataforma).
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 */
async function exigirMpConectado(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
): Promise<void>
{
  const { data: secretos } = await admin.from("negocio_secretos")
    .select("mercadopago_access_token").eq("negocio_id", negocioId).single();

  const token = (secretos as { mercadopago_access_token?: unknown } | null)
    ?.mercadopago_access_token;

  if (typeof token !== "string" || token.trim().length === 0)
  {
    throw new ValidationError("Conectá tu MercadoPago antes de activar señas en un servicio.");
  }
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
    precioPromocional: typeof promoCruda !== "string" || promoCruda.trim().length === 0
      ? null
      : exigirNumeroCrudo(promoCruda),
    promoActiva: formData.get("promoActiva"),
    senaRequerida: formData.get("senaRequerida"),
    senaPorcentaje: !senaRequerida || typeof senaCruda !== "string" || senaCruda.trim().length === 0
      ? 0
      : exigirNumeroCrudo(senaCruda),
    remarketingActivo: formData.get("remarketingActivo"),
    remarketingDias: (() =>
    {
      const cruda = formData.get("remarketingDias");

      if (typeof cruda !== "string" || cruda.trim().length === 0)
      {
        return null;
      }

      return exigirNumeroCrudo(cruda);
    })(),
  } satisfies ServicioInput);


  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para modificar servicios.");
  }


  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  if (servicio.senaRequerida)
  {
    await exigirMpConectado(admin, negocioId);
  }

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
    throw new UnavailableError("No pudimos guardar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}

/** Elimina un servicio sin turnos del negocio del dueño autenticado. */
export async function eliminarServicio(servicioId: string): Promise<void>
{

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para modificar servicios.");
  }

  // Por ahora, mantenerlo editable.

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("servicios").delete()
    .eq("id", servicioId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    if (error.code === "23503")
    {
      throw new ConflictError("No se puede eliminar porque tiene turnos asociados. Desactivalo en su lugar.");
    }

    throw new UnavailableError("No pudimos eliminar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}

/** Activa o desactiva un servicio del negocio del dueño autenticado. */
export async function cambiarEstadoServicio(servicioId: string, activo: boolean): Promise<void>
{

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para modificar servicios.");
  }


  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("servicios").update({ activo })
    .eq("id", servicioId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos actualizar el servicio. Probá de nuevo.");
  }

  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard");
}
