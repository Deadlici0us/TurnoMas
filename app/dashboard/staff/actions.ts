"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { HORARIOS_POR_DEFECTO, validarHorariosStaff, validarNombreStaff } from "@/lib/staff/validation";
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
