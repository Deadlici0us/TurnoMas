/**
 * Disponibilidad de slots para reservas y altas manuales.
 *
 * Comparte el cálculo entre el flujo público (`POST /api/reservas`) y el
 * alta manual del dashboard: un pendiente retiene su lugar durante la
 * gracia de pago, confirmado/pagado siempre bloquean, y los eventos ajenos
 * del Google Calendar del negocio también ocupan (fail-open).
 */

import { getBlockedInterval, isSlotAvailable } from "@/lib/availability/availability";
import { calendarService } from "@/lib/services/calendar";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Ventana de gracia en la que un pendiente retiene su slot. */
const GRACIA_PAGO_MS = 15 * 60_000;

/**
 * Indica si un turno existente retiene su slot durante la gracia de pago.
 *
 * @param estado Estado del turno.
 * @param createdAt Fecha de creación ISO.
 * @param ahoraMs Ahora en milisegundos.
 * @return Verdadero cuando bloquea agenda.
 */
export function retieneSlot(estado: string, createdAt: string, ahoraMs: number): boolean
{
  if (estado === "confirmado" || estado === "pagado")
  {
    return true;
  }

  if (estado !== "pendiente")
  {
    return false;
  }

  const creado = new Date(createdAt).getTime();

  return !Number.isNaN(creado) && ahoraMs - creado < GRACIA_PAGO_MS;
}

/**
 * Filtra los turnos existentes a intervalos de bloqueo.
 *
 * @param turnos Turnos futuros del staff.
 * @param duracionPorServicio Mapa de duraciones por servicio.
 * @param duracionDefault Duración del servicio actual.
 * @param ahoraMs Ahora en milisegundos.
 * @return Intervalos que bloquean agenda.
 */
export function filtrarBloqueos(
  turnos: ReadonlyArray<{ readonly inicio: string; readonly servicio_id: string;
    readonly estado: string; readonly created_at: string }>,
  duracionPorServicio: ReadonlyMap<string, { readonly duracion_min: number }>,
  duracionDefault: number,
  ahoraMs: number,
): Array<{ readonly start: Date; readonly end: Date }>
{
  return turnos
    .filter((t) => retieneSlot(t.estado, t.created_at, ahoraMs))
    .map((t) =>
    {
      const ref = duracionPorServicio.get(t.servicio_id);

      return getBlockedInterval(new Date(t.inicio), ref?.duracion_min ?? duracionDefault);
    });
}

/** Inicio del día local (ventana para freebusy de Google). */
export function inicioDelDia(fecha: Date): Date
{
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
}

/** Fin del día local (ventana para freebusy de Google). */
export function finDelDia(fecha: Date): Date
{
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1, 0, 0, 0, 0);
}

/**
 * Verifica que el slot siga libre en agenda y Google.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param staffId ID del staff.
 * @param inicio Inicio solicitado.
 * @param duracionMin Duración del servicio.
 * @return Verdadero cuando está ocupado.
 */
export async function estaOcupado(
  admin: SupabaseClient,
  negocioId: string,
  staffId: string,
  inicio: Date,
  duracionMin: number,
): Promise<boolean>
{
  const ahoraMs = Date.now();
  const { data: turnosExistentes } = await admin.from("turnos")
    .select("inicio, servicio_id, estado, created_at")
    .eq("negocio_id", negocioId).eq("staff_id", staffId).gte("inicio", new Date(ahoraMs).toISOString());
  const { data: serviciosTodos } = await admin.from("servicios")
    .select("id, duracion_min").eq("negocio_id", negocioId);
  const duracionPorServicio = new Map((serviciosTodos ?? []).map((s: {
    id: string; duracion_min: number;
  }) => [s.id, s]));
  const bloqueos = filtrarBloqueos(
    ((turnosExistentes ?? []) as Array<{
      inicio: string; servicio_id: string; estado: string; created_at: string;
    }>),
    duracionPorServicio,
    duracionMin,
    ahoraMs,
  );
  const ocupadoGoogle = await calendarService.getBusyIntervalsForNegocio(
    negocioId, inicioDelDia(inicio), finDelDia(inicio));

  return !isSlotAvailable(inicio, duracionMin, [...bloqueos, ...ocupadoGoogle]);
}
