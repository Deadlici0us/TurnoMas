/**
 * Generación de turnos disponibles para el portal (Módulo 2).
 *
 * Compone los horarios del profesional (`lib/staff/schedule`)
 * con el motor de disponibilidad (`lib/availability`).
 */

import
{
  getBlockedInterval,
  isSlotAvailable,
} from "@/lib/availability/availability";
import type { BlockedInterval } from "@/lib/availability/availability";
import { lookupDayRange } from "@/lib/staff/schedule";

export interface TurnoExistente
{
  readonly staffId: string;
  readonly inicio: string;
  readonly duracionMin: number;
  readonly bufferMin: number;
}

export interface DiaDisponible
{
  readonly date: Date;
  readonly starts: readonly Date[];
}

const MS_PER_DAY = 86_400_000;

/** Genera inicios candidatos cada `stepMinutes` sin exceder el cierre. */
export function buildDaySlots(
  day: Date,
  openMinutes: number,
  closeMinutes: number,
  serviceMinutes: number,
  stepMinutes = 30,
): readonly Date[]
{
  const starts: Date[] = [];

  for (let minutes = openMinutes; minutes + serviceMinutes <= closeMinutes; minutes += stepMinutes)
  {
    starts.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes, 0, 0));
  }

  return starts;
}

/** Filtra candidatos que solapan bloqueos existentes (duración + buffer). */
export function filterAvailableSlots(
  candidates: readonly Date[],
  serviceMinutes: number,
  bufferMinutes: number,
  existingBlocked: readonly BlockedInterval[],
): readonly Date[]
{
  return candidates.filter((start) => isSlotAvailable(start, serviceMinutes, bufferMinutes, existingBlocked));
}

/** Arma los días disponibles del profesional para los próximos `days` días. */
export function buildAvailableSlots(
  horarios: Record<string, string>,
  turnos: readonly TurnoExistente[],
  serviceMinutes: number,
  bufferMinutes: number,
  now: Date = new Date(),
  days = 7,
  stepMinutes = 30,
  staffId: string | null = null,
): readonly DiaDisponible[]
{
  const result: DiaDisponible[] = [];

  for (let offset = 0; offset < days; offset += 1)
  {
    const date = new Date(now.getTime() + offset * MS_PER_DAY);
    const range = lookupDayRange(horarios, date.getDay());

    if (range === null)
    {
      continue;
    }

    const candidates = buildDaySlots(date, range.openMinutes, range.closeMinutes, serviceMinutes, stepMinutes);
    const blocked: BlockedInterval[] = turnos
      .filter((turno) => staffId === null || turno.staffId === staffId)
      .map((turno) => getBlockedInterval(new Date(turno.inicio), turno.duracionMin, turno.bufferMin));
    const starts = filterAvailableSlots(candidates, serviceMinutes, bufferMinutes, blocked);

    if (starts.length > 0)
    {
      result.push({ date, starts });
    }
  }

  return result;
}
