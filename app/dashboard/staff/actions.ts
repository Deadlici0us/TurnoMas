"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { validarServiciosStaff } from "@/lib/staff/servicios";
import {
  HORARIOS_POR_DEFECTO,
  validarDescripcionStaff,
  validarFotoUrl,
  validarHorariosStaff,
  validarNombreStaff,
} from "@/lib/staff/validation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Agrega un profesional al equipo del negocio del dueño autenticado. */
export async function agregarStaff(nombre: string): Promise<void>
{
  const value = validarNombreStaff(nombre);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para agregar profesionales.");
  }

  // Permitir que el dueño demo modifique su equipo.


  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("staff")
    .insert({ negocio_id: negocioId, nombre: value, horarios: HORARIOS_POR_DEFECTO });

  if (error !== null)
  {
    throw new Error("No pudimos agregar al profesional. Probá de nuevo.");
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}

/** Actualiza las franjas horarias semanales de un profesional. */
export async function actualizarHorariosStaff(staffId: string, horarios: unknown): Promise<void>
{
  const value = validarHorariosStaff(horarios);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar los horarios.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("staff").update({ horarios: value })
    .eq("id", staffId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos guardar los horarios. Probá de nuevo.");
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}

/** Activa o desactiva un profesional del negocio del dueño autenticado. */
export async function cambiarEstadoStaff(staffId: string, activo: boolean): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar el equipo.");
  }

  // Permitir acción para demo.


  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("staff").update({ activo })
    .eq("id", staffId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos actualizar al profesional. Probá de nuevo.");
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}

/** Elimina un profesional solo si no tiene turnos (el historial se preserva). */
export async function eliminarStaff(staffId: string): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar el equipo.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { count } = await admin.from("turnos").select("id", { count: "exact", head: true })
    .eq("staff_id", staffId).eq("negocio_id", negocioId);

  if ((count ?? 0) > 0)
  {
    throw new Error("Tiene turnos registrados. Mejor desactivalo para conservar el historial.");
  }

  const { error } = await admin.from("staff").delete()
    .eq("id", staffId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos eliminar al profesional. Probá de nuevo.");
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}

/**
 * Actualiza la descripción y los servicios que brinda un profesional.
 *
 * La descripción es opcional (null si viene vacía). Los servicios se reemplazan
 * por completo; se descartan IDs que no pertenezcan al negocio del dueño.
 */
export async function actualizarPerfilStaff(
  staffId: string,
  descripcion: unknown,
  serviciosIds: unknown,
): Promise<void>
{
  const descripcionValida = validarDescripcionStaff(descripcion);
  const ids = validarServiciosStaff(serviciosIds);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar el equipo.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { data: servicios } = await admin.from("servicios").select("id").eq("negocio_id", negocioId);
  const permitidos = new Set(((servicios ?? []) as Array<{ id: string }>).map((s) => s.id));
  const serviciosValidos = ids.filter((id) => permitidos.has(id));

  const { error: perfilError } = await admin.from("staff")
    .update({ descripcion: descripcionValida }).eq("id", staffId).eq("negocio_id", negocioId);

  if (perfilError !== null)
  {
    throw new Error("No pudimos guardar el perfil. Probá de nuevo.");
  }

  const { error: borradoError } = await admin.from("staff_servicios").delete()
    .eq("staff_id", staffId).eq("negocio_id", negocioId);

  if (borradoError !== null)
  {
    throw new Error("No pudimos guardar los servicios. Probá de nuevo.");
  }

  if (serviciosValidos.length > 0)
  {
    const filas = serviciosValidos.map((servicioId) => ({
      staff_id: staffId,
      servicio_id: servicioId,
      negocio_id: negocioId,
    }));

    const { error: insercionError } = await admin.from("staff_servicios").insert(filas);

    if (insercionError !== null)
    {
      throw new Error("No pudimos guardar los servicios. Probá de nuevo.");
    }
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}

/** Guarda la URL pública de la foto del profesional (o la limpia). */
export async function actualizarFotoStaff(staffId: string, fotoUrl: unknown): Promise<void>
{
  const url = validarFotoUrl(fotoUrl);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar el equipo.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("staff").update({ foto_url: url })
    .eq("id", staffId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos guardar la foto. Probá de nuevo.");
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
}
