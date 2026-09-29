import { buildDemoSeed } from "@/lib/seed/demo-rows";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Re-siembras la cuenta demo: borra hijos del negocio y reinserta el seed.
 *
 * @param ownerId UID del dueño demo (auth.users.id).
 * @returns ID del negocio reseteado.
 */
export async function reseedDemoBusiness(ownerId: string): Promise<string>
{
  const duenio = ownerId.trim();

  if (duenio.length === 0)
  {
    throw new Error("Falta el dueño demo para restablecer.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", duenio).single();

  if (negocio === null)
  {
    throw new Error("No encontramos el negocio demo.");
  }

  const negocioId = (negocio as { id: string }).id;
  const seed = buildDemoSeed(duenio);

  // Borrado en orden hijo → padre para respetar FK restrict en turnos.
  await admin.from("turnos").delete().eq("negocio_id", negocioId);
  await admin.from("clientes").delete().eq("negocio_id", negocioId);
  await admin.from("servicios").delete().eq("negocio_id", negocioId);
  await admin.from("staff").delete().eq("negocio_id", negocioId);

  const steps = [
    admin.from("staff").insert([...seed.staff.map((s) => ({ ...s, negocio_id: negocioId }))]),
    admin.from("servicios").insert([...seed.servicios.map((s) => ({ ...s, negocio_id: negocioId }))]),
    admin.from("clientes").insert([...seed.clientes.map((c) => ({ ...c, negocio_id: negocioId }))]),
  ];

  for (const step of steps)
  {
    const { error } = await step;

    if (error !== null)
    {
      throw new Error("No pudimos restablecer la demo. Probá de nuevo.");
    }
  }

  const { error: turnosError } = await admin.from("turnos")
    .insert([...seed.turnos.map((t) => ({ ...t, negocio_id: negocioId }))]);

  if (turnosError !== null)
  {
    throw new Error("No pudimos restablecer la demo. Probá de nuevo.");
  }

  return negocioId;
}
