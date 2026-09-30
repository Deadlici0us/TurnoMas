/**
 * Horarios de profesionales (Módulo 3): múltiples franjas `HH:MM-HH:MM`
 * por día individual (lun, mar, mié, jue, vie, sáb, dom).
 *
 * Legacy compat: un string antiguo `"09:00-19:00"` se lee como `["09:00-19:00"]`.
 * Franja vacía o clave ausente = cerrado ese día.
 */

export interface DayRange
{
  readonly openMinutes: number;
  readonly closeMinutes: number;
}

export type DayKey = "lun" | "mar" | "mié" | "jue" | "vie" | "sáb" | "dom";

const RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

/** Parsea un rango `HH:MM-HH:MM` a minutos desde medianoche. */
export function parseDayRange(raw: string): DayRange
{
  const match = RANGE_PATTERN.exec(raw.trim());

  if (match === null)
  {
    throw new RangeError("El horario debe tener formato HH:MM-HH:MM (ej. 09:00-19:00).");
  }

  const openMinutes = Number(match[1]) * 60 + Number(match[2]);
  const closeMinutes = Number(match[3]) * 60 + Number(match[4]);

  if (closeMinutes <= openMinutes)
  {
    throw new RangeError("El cierre debe ser posterior a la apertura.");
  }

  return { openMinutes, closeMinutes };
}

/** Parsea un valor crudo (string legacy o array) a un array de DayRange. */
export function parseDayRanges(raw: unknown): DayRange[]
{
  if (raw === null || raw === undefined)
  {
    return [];
  }

  if (typeof raw === "string")
  {
    const trimmed = raw.trim();

    if (trimmed.length === 0)
    {
      return [];
    }

    return [parseDayRange(trimmed)];
  }

  if (!Array.isArray(raw))
  {
    throw new RangeError("El horario del día debe ser un texto o una lista.");
  }

  const ranges: DayRange[] = [];

  for (const item of raw)
  {
    if (typeof item !== "string" || item.trim().length === 0)
    {
      continue;
    }

    ranges.push(parseDayRange(item));
  }

  // Rechaza solapes entre franjas del mismo día.
  for (let i = 0; i < ranges.length; i += 1)
  {
    for (let j = i + 1; j < ranges.length; j += 1)
    {
      if (intervalsOverlap(ranges[i], ranges[j]))
      {
        throw new RangeError("Las franjas horarias del mismo día no pueden solaparse.");
      }
    }
  }

  return ranges;
}

function intervalsOverlap(a: DayRange, b: DayRange): boolean
{
  return a.openMinutes < b.closeMinutes && b.openMinutes < a.closeMinutes;
}

/** Formatea minutos desde medianoche como `HH:MM`. */
export function formatMinutes(minutes: number): string
{
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Formatea un rango a `HH:MM-HH:MM`. */
export function formatDayRange(range: DayRange): string
{
  return `${formatMinutes(range.openMinutes)}-${formatMinutes(range.closeMinutes)}`;
}

/** Mapea el día de semana JS (0 = domingo) a la clave de horarios. */
export function dayKeyForWeekday(weekday: number): DayKey
{
  switch (weekday)
  {
    case 0:
    {
      return "dom";
    }
    case 1:
    {
      return "lun";
    }
    case 2:
    {
      return "mar";
    }
    case 3:
    {
      return "mié";
    }
    case 4:
    {
      return "jue";
    }
    case 5:
    {
      return "vie";
    }
    case 6:
    {
      return "sáb";
    }
    default:
    {
      return "lun";
    }
  }
}

/** Devuelve el orden canónico de los días para iterar la semana. */
export const DAY_ORDER: readonly DayKey[] = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** Etapa legible para la UI. */
export function dayLabel(key: DayKey): string
{
  switch (key)
  {
    case "lun":
    {
      return "Lunes";
    }
    case "mar":
    {
      return "Martes";
    }
    case "mié":
    {
      return "Miércoles";
    }
    case "jue":
    {
      return "Jueves";
    }
    case "vie":
    {
      return "Viernes";
    }
    case "sáb":
    {
      return "Sábado";
    }
    case "dom":
    {
      return "Domingo";
    }
  }
}

/** Resuelve las franjas del día según los horarios del profesional (vacío = cerrado). */
export function lookupDayRanges(horarios: Record<string, unknown>, weekday: number): DayRange[]
{
  const key = dayKeyForWeekday(weekday);
  const raw = horarios[key];

  if (raw !== undefined)
  {
    return parseDayRanges(raw);
  }

  // Compat legacy: claves agrupadas `lun-vie` / `sab` / `dom` con string simple.
  const legacyKey = weekday === 0 ? "dom" : weekday === 6 ? "sab" : "lun-vie";
  const legacy = horarios[legacyKey];

  if (legacy === undefined)
  {
    return [];
  }

  return parseDayRanges(legacy);
}