"use server";

import { revalidatePath } from "next/cache";

import { AuthError } from "@/lib/errors/auth-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { ValidationError } from "@/lib/errors/validation-error";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Negocio del dueño con datos del plan. */
async function negocioDelDueno(): Promise<{
  id: string; email: string; pais: string | null; mpId: string | null; venceEn: string | null;
}>
{

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para gestionar tu plan.");
  }


  if (typeof user.email !== "string" || user.email.trim().length === 0)
  {
    throw new ValidationError("Necesitamos tu email para el débito mensual.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios")
    .select("id, pais, suscripcion_mp_id, suscripcion_vence_en").eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  const row = negocio as {
    id: string; pais?: unknown; suscripcion_mp_id?: unknown; suscripcion_vence_en?: unknown;
  };

  return {
    id: row.id,
    email: user.email,
    pais: typeof row.pais === "string" ? row.pais : null,
    mpId: typeof row.suscripcion_mp_id === "string" && row.suscripcion_mp_id.length > 0
      ? row.suscripcion_mp_id
      : null,
    venceEn: typeof row.suscripcion_vence_en === "string" && row.suscripcion_vence_en.length > 0
      ? row.suscripcion_vence_en
      : null,
  };
}

/**
 * Cancela el plan en MP y limpia el plan local.
 */
export async function cancelarPlan(): Promise<void>
{
  const { id, mpId, venceEn } = await negocioDelDueno();

  // Sin preapproval en MP igual se limpia el plan local (idempotente): el
  // estado puede haber quedado desincronizado si se canceló desde MP.
  if (mpId === null)
  {
    await subscriptionService.cancelarSuscripcionLocal(id);
  }
  else
  {
    await subscriptionService.cancelarParaNegocio(id, mpId, venceEn);
  }

  revalidatePath("/dashboard/suscripcion");
}
