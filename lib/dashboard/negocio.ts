/**
 * Resuelve el negocio del dueño autenticado para las Server Actions.
 *
 * Todas las escrituras del dashboard se filtran por `negocio_id`: un dueño
 * solo puede modificar sus propias filas aunque use service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { NotFoundError } from "@/lib/errors/not-found-error";

/** Devuelve el `id` del negocio del dueño o lanza si no existe. */
export async function getNegocioIdDelDueno(admin: SupabaseClient, userId: string): Promise<string>
{
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", userId).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  return negocio.id as string;
}
