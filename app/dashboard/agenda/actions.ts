"use server";

import { revalidatePath } from "next/cache";

import { validarTransicionTurno } from "@/lib/dashboard/estados";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { cancelarTurno, CancelacionError } from "@/lib/services/cancelacion";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const ESTADOS_VALIDOS: ReadonlySet<EstadoTurno> = new Set(["pendiente", "confirmado", "pagado",
  "completado", "cancelado", "ausente"]);

interface TurnoEditable
{
  readonly negocioId: string;
  readonly turno: {
    readonly estado: unknown;
    readonly cliente_id?: unknown;
  } & Record<string, unknown>;
}

/**
 * Exige un turno editable del negocio del dueño autenticado.
 *
 * @param turnoId ID del turno.
 * @param nuevo Estado destino.
 * @return Negocio y turno validados.
 */
async function exigirTurnoEditable(turnoId: string, nuevo: EstadoTurno): Promise<TurnoEditable>
{
  if (!ESTADOS_VALIDOS.has(nuevo))
  {
    throw new RangeError("Ese estado de turno no existe.");
  }


  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para modificar la agenda.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  const negocioId = (negocio as { id: string }).id;
  const { data: turno } = await admin.from("turnos")
    .select("id, estado, inicio, cliente_id, servicio_id, mp_payment_id, sena_reembolsada")
    .eq("id", turnoId).eq("negocio_id", negocioId).single();

  if (turno === null)
  {
    throw new NotFoundError("No encontramos ese turno en tu agenda.");
  }

  const turnoRow = turno as unknown as TurnoEditable["turno"];

  validarTransicionTurno(turnoRow.estado as EstadoTurno, nuevo);

  return { negocioId, turno: turnoRow };
}

/**
 * Registra la ausencia del cliente.
 *
 * @param turno Turno marcado ausente.
 */
async function registrarAusencia(turno: Record<string, unknown>): Promise<void>
{
  if (typeof turno.cliente_id !== "string")
  {
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: cliente } = await admin.from("clientes").select("ausencias")
    .eq("id", turno.cliente_id).single();

  if (cliente !== null && typeof cliente.ausencias === "number")
  {
    await admin.from("clientes").update({ ausencias: cliente.ausencias + 1 })
      .eq("id", turno.cliente_id);
  }
}

/** Actualiza el estado de un turno del negocio del dueño autenticado. */
export async function actualizarEstadoTurno(turnoId: string, nuevo: EstadoTurno): Promise<void>
{
  const { turno } = await exigirTurnoEditable(turnoId, nuevo);

  if (nuevo === "cancelado")
  {
    try
    {
      await cancelarTurno({ turnoId, actor: "duenio" });
    }
    catch (error)
    {
      if (error instanceof CancelacionError)
      {
        throw new ConflictError(error.message);
      }

      throw error;
    }

    revalidatePath("/dashboard/agenda");
    revalidatePath("/dashboard");

    return;
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("turnos").update({ estado: nuevo }).eq("id", turnoId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos actualizar el turno. Probá de nuevo.");
  }

  if (nuevo === "ausente")
  {
    await registrarAusencia(turno);
  }

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
}
