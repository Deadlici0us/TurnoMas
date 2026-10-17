"use server";

import { revalidatePath } from "next/cache";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Negocio del dueño con datos del plan. */
async function negocioDelDueno(): Promise<{
  id: string; email: string; pais: string | null; mpId: string | null;
}>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para gestionar tu plan.");
  }

  assertDuenoEditable({ userId: user.id, email: user.email ?? null });

  if (typeof user.email !== "string" || user.email.trim().length === 0)
  {
    throw new Error("Necesitamos tu email para el débito mensual.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios")
    .select("id, pais, suscripcion_mp_id").eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const row = negocio as { id: string; pais?: unknown; suscripcion_mp_id?: unknown };

  return {
    id: row.id,
    email: user.email,
    pais: typeof row.pais === "string" ? row.pais : null,
    mpId: typeof row.suscripcion_mp_id === "string" && row.suscripcion_mp_id.length > 0
      ? row.suscripcion_mp_id
      : null,
  };
}

/**
 * Cancela el plan en MP y limpia el plan local.
 */
export async function cancelarPlan(): Promise<void>
{
  const { id, mpId } = await negocioDelDueno();

  if (mpId === null)
  {
    throw new Error("No tenés un plan activo para cancelar.");
  }

  await subscriptionService.cancelarParaNegocio(id, mpId);

  revalidatePath("/dashboard/facturacion");
}
