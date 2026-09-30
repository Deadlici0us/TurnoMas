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
import { lookupDayRanges } from "@/lib/staff/schedule";

export interface TurnoExistente
{
  readonly staffId: string;
  readonly inicio: string;
  readonly duracionMin: number;
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

/** Filtra candidatos que solapan bloqueos existentes. */
export function filterAvailableSlots(
  candidates: readonly Date[],
  serviceMinutes: number,
  existingBlocked: readonly BlockedInterval[],
): readonly Date[]
{
  return candidates.filter((start) => isSlotAvailable(start, serviceMinutes, existingBlocked));
}

/** Arma los días disponibles del profesional para los próximos `days` días. */
export function buildAvailableSlots(
  horarios: Record<string, unknown>,
  turnos: readonly TurnoExistente[],
  serviceMinutes: number,
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
    const ranges = lookupDayRanges(horarios, date.getDay());

    if (ranges.length === 0)
    {
      continue;
    }

    const blocked: BlockedInterval[] = turnos
      .filter((turno) => staffId === null || turno.staffId === staffId)
      .map((turno) => getBlockedInterval(new Date(turno.inicio), turno.duracionMin));

    const allStarts: Date[] = [];

    for (const range of ranges)
    {
      const candidates = buildDaySlots(date, range.openMinutes, range.closeMinutes, serviceMinutes, stepMinutes);

      allStarts.push(...filterAvailableSlots(candidates, serviceMinutes, blocked));
    }

    const seen = new Set<number>();
    const starts = allStarts
      .filter((start) =>
      {
        if (seen.has(start.getTime()))
        {
          return false;
        }

        seen.add(start.getTime());

        return true;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    if (starts.length > 0)
    {
      result.push({ date, starts });
    }
  }

  return result;
}
