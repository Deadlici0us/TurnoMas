"use server";

import { revalidatePath } from "next/cache";

import { isDemoOwner } from "@/lib/auth/demo-guard";
import { reseedDemoBusiness } from "@/lib/demo/reseed";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Restablece la cuenta demo a los datos iniciales.
 * Solo el dueño demo puede ejecutarla; los cambios son públicos por diseño.
 */
export async function resetDemoData(): Promise<void>
{
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para restablecer la demo.");
  }

  if (!isDemoOwner({ userId: user.id, email: user.email ?? null }))
  {
    throw new Error("Solo la cuenta demo puede restablecerse desde acá.");
  }

  await reseedDemoBusiness(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/config");
}
