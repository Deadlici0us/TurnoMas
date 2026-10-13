/**
 * Rango visible del calendario a partir del horario del negocio.
 *
 * Lógica pura: dado un conjunto de días civiles y los horarios del negocio
 * (`negocios.horarios`, mismo formato que `staff.horarios`), devuelve la base
 * `horaDesde/horaHasta` que debe cubrir la grilla. Franjas múltiples del mismo
 * día se colapsan a min-max continuo. Día cerrado o sin horario = rango mínimo
 * de 4h para no dejar la vista vacía.
 */

import type { DiaCivil } from "@/lib/timezone/timezone";
import { lookupDayRanges } from "@/lib/staff/schedule";

/** Base horaria que impone el horario del negocio antes de expandir por turnos. */
export interface BaseHorario
{
  readonly horaDesde: number;
  readonly horaHasta: number;
  readonly hayHorario: boolean;
}

/** Rango mínimo cuando el negocio está cerrado o no configuró horario. */
export const HORA_CERRADO_DESDE = 8;
export const HORA_CERRADO_HASTA = 12;

/**
 * Weekday JS (0 = domingo) de un día civil, sin depender de la zona del server.
 *
 * @param dia Día civil ya resuelto en la zona del negocio.
 * @return Weekday 0-6 compatible con `lookupDayRanges`.
 */
export function weekdayDeDiaCivil(dia: DiaCivil): number
{
  return new Date(Date.UTC(dia.anio, dia.mes - 1, dia.dia)).getUTCDay();
}

/**
 * Resuelve la base del rango visible desde los horarios del negocio.
 *
 * @param dias Días civiles visibles (1 para vista día, 7 para vista semana).
 * @param horarios Horarios crudos del negocio (`Record<DayKey, string | string[]>`).
 * @return Base `horaDesde/horaHasta` en horas enteras y si hay horario.
 */
export function resolverBaseHorarioNegocio(
  dias: readonly DiaCivil[],
  horarios: Record<string, unknown>,
): BaseHorario
{
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const dia of dias)
  {
    let franjas: ReturnType<typeof lookupDayRanges> = [];

    try
    {
      franjas = lookupDayRanges(horarios, weekdayDeDiaCivil(dia));
    }
    catch
    {
      continue;
    }

    for (const franja of franjas)
    {
      if (franja.closeMinutes > franja.openMinutes)
      {
        min = Math.min(min, franja.openMinutes);
        max = Math.max(max, franja.closeMinutes);
      }
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max))
  {
    return { horaDesde: HORA_CERRADO_DESDE, horaHasta: HORA_CERRADO_HASTA, hayHorario: false };
  }

  const horaDesde = Math.max(0, Math.floor(min / 60));
  const horaHasta = Math.min(24, Math.ceil(max / 60));

  return { horaDesde, horaHasta: Math.max(horaHasta, horaDesde + 1), hayHorario: true };
}
