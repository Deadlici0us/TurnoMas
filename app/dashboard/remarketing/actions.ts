"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Obtiene el admin y el ID del negocio del dueño autenticado. */
async function exigirDueno(): Promise<{ admin: ReturnType<typeof getSupabaseAdmin>; negocioId: string }>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para marcar contactos manuales.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  return { admin, negocioId };
}

/**
 * Marca como hecho el contacto manual (WhatsApp u omisión) para el turno de
 * la última visita del cliente.
 */
export async function marcarRemarketingManual(turnoId: string): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();

  const { error } = await admin
    .from("turnos")
    .update({ remarketing_manual_at: new Date().toISOString() })
    .eq("id", turnoId)
    .eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No se pudo marcar el contacto manual.");
  }

  revalidatePath("/dashboard/remarketing");
  revalidatePath("/dashboard");
}

/** Deshace la marca manual (para el toast Deshacer). */
export async function deshacerRemarketingManual(turnoId: string): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();

  const { error } = await admin
    .from("turnos")
    .update({ remarketing_manual_at: null })
    .eq("id", turnoId)
    .eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No se pudo deshacer la marca.");
  }

  revalidatePath("/dashboard/remarketing");
  revalidatePath("/dashboard");
}
