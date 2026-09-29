"use server";

import { revalidatePath } from "next/cache";

import { validarTransicionTurno } from "@/lib/dashboard/estados";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { shouldAutoRefund } from "@/lib/payments/refund-policy";
import type { RefundableEstado } from "@/lib/payments/refund-policy";
import { paymentService } from "@/lib/services/payment";
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

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar la agenda.");
  }

  assertDuenoEditable({ userId: user.id, email: user.email ?? null });

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const negocioId = negocio.id as string;
  const { data: turno } = await admin.from("turnos")
    .select("id, estado, cliente_id, servicio_id, mp_payment_id")
    .eq("id", turnoId).eq("negocio_id", negocioId).single();

  if (turno === null)
  {
    throw new Error("No encontramos ese turno en tu agenda.");
  }

  validarTransicionTurno(turno.estado as EstadoTurno, nuevo);

  if (nuevo === "cancelado")
  {
    const turnoRow = turno as { estado?: unknown; servicio_id?: unknown; mp_payment_id?: unknown };
    const { data: servicio } = typeof turnoRow.servicio_id === "string"
      ? await admin.from("servicios").select("reembolso_auto")
        .eq("id", turnoRow.servicio_id).single()
      : { data: null };
    const reembolsoAuto = (servicio as { reembolso_auto?: unknown } | null)?.reembolso_auto !== false;
    const mpPaymentId = typeof turnoRow.mp_payment_id === "string" ? turnoRow.mp_payment_id : null;

    if (shouldAutoRefund({ reembolsoAuto, estado: turno.estado as RefundableEstado, mpPaymentId }))
    {
      try
      {
        await paymentService.refundForNegocio(negocioId, mpPaymentId as string);
      }
      catch
      {
        // Best-effort: el turno se cancela igual y la seña se devuelve
        // manual desde el panel de MercadoPago.
      }
    }
  }

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
