"use server";

import { revalidatePath } from "next/cache";

import { validarTransicionTurno } from "@/lib/dashboard/estados";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const ESTADOS_VALIDOS: readonly EstadoTurno[] = ["pendiente", "pagado", "completado", "cancelado",
  "ausente"];

/** Actualiza el estado de un turno del negocio del dueño autenticado. */
export async function actualizarEstadoTurno(turnoId: string, nuevo: EstadoTurno): Promise<void>
{
  if (!ESTADOS_VALIDOS.includes(nuevo))
  {
    throw new RangeError("Ese estado de turno no existe.");
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar la agenda.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const negocioId = negocio.id as string;
  const { data: turno } = await admin.from("turnos").select("id, estado, cliente_id")
    .eq("id", turnoId).eq("negocio_id", negocioId).single();

  if (turno === null)
  {
    throw new Error("No encontramos ese turno en tu agenda.");
  }

  validarTransicionTurno(turno.estado as EstadoTurno, nuevo);
  const { error } = await admin.from("turnos").update({ estado: nuevo }).eq("id", turnoId);

  if (error !== null)
  {
    throw new Error("No pudimos actualizar el turno. Probá de nuevo.");
  }

  if (nuevo === "ausente" && typeof turno.cliente_id === "string")
  {
    const { data: cliente } = await admin.from("clientes").select("ausencias")
      .eq("id", turno.cliente_id).single();

    if (cliente !== null && typeof cliente.ausencias === "number")
    {
      await admin.from("clientes").update({ ausencias: cliente.ausencias + 1 })
        .eq("id", turno.cliente_id);
    }
  }

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
}
