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
    throw new AuthError("Tenés que iniciar sesión para gestionar tus reseñas.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  return { admin, negocioId };
}

/** Marca (o desmarca) una reseña como resuelta. */
export async function marcarResenaResuelta(
  resenaId: string,
  resuelto: boolean,
): Promise<ActionResult<void>>
{
  return runAction("marcarResenaResuelta", async () =>
  {
    const { admin, negocioId } = await exigirDueno();

    const { error } = await admin
      .from("resenas")
      .update({ resuelto })
      .eq("id", resenaId)
      .eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No pudimos actualizar la reseña.");
    }

    revalidatePath("/dashboard/resenas");
    revalidatePath("/dashboard");
  });
}
