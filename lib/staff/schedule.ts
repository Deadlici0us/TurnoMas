/**
 * Horarios de profesionales (Módulo 3): rangos `HH:MM-HH:MM` por clave de día.
 *
 * Funciones puras para facilitar TDD y reutilización
 * en la gestión de staff y el portal de reservas.
 */

export interface DayRange
{
  readonly openMinutes: number;
  readonly closeMinutes: number;
}

export type DayKey = "lun-vie" | "sab" | "dom";

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
  if (weekday === 0)
  {
    return "dom";
  }

  if (weekday === 6)
  {
    return "sab";
  }

  return "lun-vie";
}

/** Resuelve el rango del día según los horarios del profesional, o null si no trabaja. */
export function lookupDayRange(horarios: Record<string, string>, weekday: number): DayRange | null
{
  const raw = horarios[dayKeyForWeekday(weekday)];

  if (raw === undefined)
  {
    return null;
  }

  return parseDayRange(raw);
}
