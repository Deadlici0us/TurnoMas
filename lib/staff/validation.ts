/**
 * Validación pura del equipo (staff) del negocio.
 *
 * Espeja los `check` de `supabase/migrations/0000_init.sql` para fallar
 * rápido en la Server Action con mensajes en es-AR.
 */

import { DAY_ORDER, formatDayRange, parseDayRanges, type DayKey } from "./schedule";

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;

/** Valida y recorta el nombre de un profesional (2 a 80 caracteres). */
export function validarNombreStaff(nombre: unknown): string
{
  if (typeof nombre !== "string")
  {
    throw new RangeError("El nombre del profesional tiene que ser texto.");
  }

  const value = nombre.trim();

  if (value.length < NOMBRE_MINIMO || value.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del profesional tiene que tener entre 2 y 80 caracteres.");
  }

  return value;
}

/** Horarios por defecto al crear un profesional (lun a vie corrido). */
export const HORARIOS_POR_DEFECTO: Record<DayKey, readonly string[]> =
{
  lun: ["09:00-19:00"],
  mar: ["09:00-19:00"],
  mié: ["09:00-19:00"],
  jue: ["09:00-19:00"],
  vie: ["09:00-19:00"],
  sáb: [],
  dom: [],
};

/**
 * Valida y normaliza los horarios semanales de un profesional.
 *
 * Acepta por día un texto con franjas separadas por coma
 * (`"09:00-13:00, 15:00-20:00"`) o un array de textos.
 * Día vacío o ausente = cerrado. Devuelve franjas normalizadas.
 */
export function validarHorariosStaff(horarios: unknown): Record<DayKey, string[]>
{
  if (typeof horarios !== "object" || horarios === null || Array.isArray(horarios))
  {
    throw new RangeError("Los horarios del profesional tienen que ser una lista por día.");
  }

  const record = horarios as Record<string, unknown>;
  const normalizado = {} as Record<DayKey, string[]>;

  for (const day of DAY_ORDER)
  {
    const raw = record[day];

    if (raw === undefined || raw === null)
    {
      normalizado[day] = [];

      continue;
    }

    const franjas = typeof raw === "string" ? raw.split(",") : raw;
    const ranges = parseDayRanges(franjas);

    normalizado[day] = ranges.map((range) => formatDayRange(range));
  }

  return normalizado;
}
