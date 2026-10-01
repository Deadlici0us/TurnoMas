/**
 * Sincronización App → GCal al acreditarse la seña.
 *
 * El pendiente con seña no crea evento al reservar; al pasar a `pagado`
 * (webhook de MercadoPago o marca manual cash) se inyecta el turno en el
 * Google Calendar del negocio (best-effort, idempotente por
 * `google_calendar_event_id`).
 */

import { buildTurnoEvent, calendarService } from "@/lib/services/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

/** Crea el evento GCal del turno si aún no tiene uno. Nunca lanza. */
export async function crearEventoGoogleParaTurno(turnoId: string): Promise<void>
{
  try
  {
    const admin = getSupabaseAdmin();
    const { data: turno } = await admin.from("turnos")
      .select("id, negocio_id, staff_id, servicio_id, cliente_id, inicio, fin, google_calendar_event_id")
      .eq("id", turnoId).single();

    const row = turno as {
      negocio_id?: unknown; staff_id?: unknown; servicio_id?: unknown; cliente_id?: unknown;
      inicio?: unknown; fin?: unknown; google_calendar_event_id?: unknown;
    } | null;

    if (row === null || typeof row.negocio_id !== "string")
    {
      return;
    }

    if (typeof row.google_calendar_event_id === "string" && row.google_calendar_event_id.length > 0)
    {
      return;
    }

    const negocioId = row.negocio_id;
    const [
      { data: negocio },
      { data: staff },
      { data: servicio },
      { data: cliente },
    ] = await Promise.all([
      admin.from("negocios").select("nombre, timezone, pais").eq("id", negocioId).single(),
      typeof row.staff_id === "string"
        ? admin.from("staff").select("nombre").eq("id", row.staff_id).single()
        : Promise.resolve({ data: null }),
      typeof row.servicio_id === "string"
        ? admin.from("servicios").select("nombre, duracion_min").eq("id", row.servicio_id).single()
        : Promise.resolve({ data: null }),
      typeof row.cliente_id === "string"
        ? admin.from("clientes").select("nombre, whatsapp").eq("id", row.cliente_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const inicio = typeof row.inicio === "string" ? new Date(row.inicio) : null;

    if (inicio === null || Number.isNaN(inicio.getTime()))
    {
      return;
    }

    const finRaw = typeof row.fin === "string" ? new Date(row.fin) : null;
    const duracion = (servicio as { duracion_min?: unknown } | null)?.duracion_min;
    const fin = finRaw !== null && !Number.isNaN(finRaw.getTime())
      ? finRaw
      : new Date(inicio.getTime() + (typeof duracion === "number" ? duracion : 30) * 60_000);

    const timeZone = resolverTimezoneNegocio({
      timezone: (negocio as { timezone?: unknown } | null)?.timezone,
      pais: (negocio as { pais?: unknown } | null)?.pais,
    });

    const eventId = await calendarService.createEventForNegocio(negocioId, {
      ...buildTurnoEvent({
        negocio: (negocio as { nombre?: string } | null)?.nombre ?? "Turno",
        servicio: (servicio as { nombre?: string } | null)?.nombre ?? "Servicio",
        profesional: (staff as { nombre?: string } | null)?.nombre ?? "Profesional",
        cliente: (cliente as { nombre?: string } | null)?.nombre ?? "Cliente",
        whatsapp: (cliente as { whatsapp?: string } | null)?.whatsapp ?? "",
        inicio,
        fin,
      }),
      timeZone,
    });

    if (eventId !== null)
    {
      await admin.from("turnos").update({ google_calendar_event_id: eventId }).eq("id", turnoId);
    }
  }
  catch
  {
    // Best-effort: el turno ya está pagado aunque falle Google.
  }
}
