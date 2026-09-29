"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { validarNombreStaff } from "@/lib/staff/validation";
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

  const { error } = await admin.from("staff").insert({ negocio_id: negocioId, nombre: value });

  if (error !== null)
  {
    throw new Error("No pudimos agregar al profesional. Probá de nuevo.");
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
