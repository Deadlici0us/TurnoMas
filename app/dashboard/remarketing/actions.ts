"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/action-result";
import { runAction } from "@/lib/actions/run-action";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { AuthError } from "@/lib/errors/auth-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Obtiene el admin y el ID del negocio del dueño autenticado. */
async function exigirDueno()
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para marcar contactos manuales.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  return { admin, negocioId };
}

/**
 * Marca como hecho el contacto manual (WhatsApp u omisión) para el turno de
 * la última visita del cliente.
 */
export async function marcarRemarketingManual(turnoId: string): Promise<ActionResult<void>>
{
  return runAction("marcarRemarketingManual", async () =>
  {
    const { admin, negocioId } = await exigirDueno();

    const { error } = await admin
      .from("turnos")
      .update({ remarketing_manual_at: new Date().toISOString() })
      .eq("id", turnoId)
      .eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No se pudo marcar el contacto manual.");
    }

    revalidatePath("/dashboard/remarketing");
    revalidatePath("/dashboard");
  });
}

/** Deshace la marca manual (para el toast Deshacer). */
export async function deshacerRemarketingManual(turnoId: string): Promise<ActionResult<void>>
{
  return runAction("deshacerRemarketingManual", async () =>
  {
    const { admin, negocioId } = await exigirDueno();

    const { error } = await admin
      .from("turnos")
      .update({ remarketing_manual_at: null })
      .eq("id", turnoId)
      .eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No se pudo deshacer la marca.");
    }

    revalidatePath("/dashboard/remarketing");
    revalidatePath("/dashboard");
  });
}
