"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const PENALIDADES = ["blocked", "fullDeposit"] as const;

export type PenalidadListaNegra = (typeof PENALIDADES)[number];

/** Actualiza el umbral y la penalidad de lista negra del negocio del dueño. */
export async function actualizarPoliticaListaNegra(umbral: number, penalidad: PenalidadListaNegra): Promise<void>
{
  if (!Number.isInteger(umbral) || umbral < 1 || umbral > 10)
  {
    throw new RangeError("El umbral debe ser un entero entre 1 y 10.");
  }

  if (!PENALIDADES.includes(penalidad))
  {
    throw new RangeError("Esa penalidad no existe.");
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ blacklist_umbral: umbral, blacklist_penalidad: penalidad }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new Error("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}
