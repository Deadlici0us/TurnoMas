/**
 * Modelo UI para el editor visual de horarios semanales.
 *
 * Puente entre el formato persistido (`Record<DayKey, string | string[]>`,
 * ej. `"09:00-13:00, 15:00-20:00"`) y el estado del editor (minutos).
 * Todo es puro y tolerante: lo inválido se trata como cerrado para no
 * romper la UI de barberos/esteticistas.
 */

import { DAY_ORDER, formatDayRange, parseDayRanges, type DayKey, type DayRange } from "@/lib/staff/schedule";

/** Minuto máximo del día (24:00) para los sliders. */
export const MAX_MINUTOS_DIA = 1440;

/** Paso del reloj nativo en segundos (30 min, solo sugerencia visual). */
export const PASO_STEPPER_MINUTOS = 30;

/** Máximo de franjas por día en el asistente (corrido o cortado). */
export const MAX_FRANJAS_POR_DIA = 2;

/** Modo de jornada de un día: cerrado, corrido (1 turno) o cortado (2 turnos). */
export type ModoJornada = "cerrado" | "corrido" | "cortado";

/**
 * Opciones legacy cada 30 min (00:00 a 23:30, en minutos).
 *
 * Obsoleto: el editor ahora usa el reloj nativo del sistema.
 * Se conserva para no romper imports existentes.
 */
export const OPCIONES_HORAS_30: readonly number[] = Array.from(
  { length: 48 },
  (_, indice) => indice * 30,
);

/** Jornada corrida por defecto (9 a 19). */
export const PRESET_CORRIDO: readonly DayRange[] = [{ openMinutes: 540, closeMinutes: 1140 }];

/** Jornada cortada con descanso (9 a 13 y 15 a 20). */
export const PRESET_CORTADO: readonly DayRange[] = [
  { openMinutes: 540, closeMinutes: 780 },
  { openMinutes: 900, closeMinutes: 1200 },
];

/** Sábado de medio día (9 a 14). */
export const PRESET_SABADO: readonly DayRange[] = [{ openMinutes: 540, closeMinutes: 840 }];

/** Semana completa en minutos, lista para el editor. */
export type SemanaUI = Record<DayKey, DayRange[]>;

/**
 * Formatea minutos desde medianoche como `HH:MM`.
 *
 * @param minutes Minutos desde medianoche.
 * @return Hora en formato `HH:MM`.
 */
export function minutosAHora(minutes: number): string
{
  const clamped = Math.max(0, Math.min(MAX_MINUTOS_DIA, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const rest = clamped % 60;

  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Parsea una hora tolerante (`"9:00"`, `"09:00"`) a minutos.
 *
 * @param raw Texto de hora.
 * @return Minutos desde medianoche.
 */
export function horaAMinutos(raw: string): number
{
  const trimmed = raw.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);

  if (match === null)
  {
    throw new RangeError("Usá formato de hora HH:MM (ej. 09:00).");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Redondea minutos al paso dado y los limita al día (0–1440).
 *
 * @param minutes Minutos a ajustar.
 * @param paso Paso en minutos (default 30).
 * @return Minutos ajustados dentro del día.
 */
export function ajustarMinutos(minutes: number, paso: number = PASO_STEPPER_MINUTOS): number
{
  const redondeado = Math.round(minutes / paso) * paso;

  return Math.max(0, Math.min(MAX_MINUTOS_DIA, redondeado));
}

/**
 * Clasifica las franjas de un día en cerrado, corrido o cortado.
 *
 * @param franjas Franjas del día en minutos.
 * @return Modo de jornada.
 */
export function modoDeFranjas(franjas: readonly DayRange[]): ModoJornada
{
  if (franjas.length === 0)
  {
    return "cerrado";
  }

  if (franjas.length === 1)
  {
    return "corrido";
  }

  return "cortado";
}

/**
 * Recorta las franjas legacy a un máximo de 2, ordenadas por apertura.
 *
 * @param franjas Franjas del día en minutos.
 * @return Hasta 2 franjas ordenadas.
 */
export function normalizarDiaAMaxDos(franjas: readonly DayRange[]): DayRange[]
{
  return franjas
    .map((franja) => ({ ...franja }))
    .sort((a, b) => a.openMinutes - b.openMinutes)
    .slice(0, MAX_FRANJAS_POR_DIA);
}

/**
 * Serializa las franjas de un día al formato legacy con comas.
 *
 * @param franjas Franjas del día en minutos.
 * @return Texto `"09:00-13:00, 15:00-20:00"` o `""` si está cerrado.
 */
export function serializarDia(franjas: readonly DayRange[]): string
{
  return franjas.map((franja) => formatDayRange(franja)).join(", ");
}

/**
 * Convierte horarios crudos (string, array, null) al modelo del editor.
 *
 * @param horarios Horarios crudos del negocio o del profesional.
 * @return Semana completa; lo inválido o ausente queda como cerrado.
 */
export function convertirHorariosAUI(horarios: unknown): SemanaUI
{
  const semana = {} as SemanaUI;

  for (const day of DAY_ORDER)
  {
    semana[day] = [];
  }

  if (typeof horarios !== "object" || horarios === null || Array.isArray(horarios))
  {
    return semana;
  }

  const record = horarios as Record<string, unknown>;

  for (const day of DAY_ORDER)
  {
    const raw = record[day];

    if (raw === undefined || raw === null)
    {
      continue;
    }

    try
    {
      semana[day] = parseDayRanges(raw);
    }
    catch
    {
      semana[day] = [];
    }
  }

  return semana;
}

/**
 * Valida las franjas de un día con mensajes en es-AR para la UI.
 *
 * @param franjas Franjas del día en minutos.
 * @return Mensaje de error o null si están bien.
 */
export function errorDeFranjas(franjas: readonly DayRange[]): string | null
{
  for (const franja of franjas)
  {
    if (franja.closeMinutes <= franja.openMinutes)
    {
      return "El cierre tiene que ser después de la apertura.";
    }

    if (franja.openMinutes < 0 || franja.closeMinutes > MAX_MINUTOS_DIA)
    {
      return "El horario tiene que estar entre 00:00 y 24:00.";
    }
  }

  for (let i = 0; i < franjas.length; i += 1)
  {
    for (let j = i + 1; j < franjas.length; j += 1)
    {
      const a = franjas[i];
      const b = franjas[j];

      if (a.openMinutes < b.closeMinutes && b.openMinutes < a.closeMinutes)
      {
        return "Esos turnos se superponen. Separalos o unilos en uno solo.";
      }
    }
  }

  return null;
}

/**
 * Formatea una hora corta para etiquetas (`9`, `9:30`, `19`).
 *
 * @param minutes Minutos desde medianoche.
 * @return Etiqueta corta legible.
 */
export function formatearHoraCorta(minutes: number): string
{
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0)
  {
    return String(hours);
  }

  return `${String(hours)}:${String(rest).padStart(2, "0")}`;
}

/**
 * Resume una franja como `9 a 13`.
 *
 * @param franja Franja en minutos.
 * @return Resumen legible.
 */
function resumirFranja(franja: DayRange): string
{
  return `${formatearHoraCorta(franja.openMinutes)} a ${formatearHoraCorta(franja.closeMinutes)}`;
}

/**
 * Resume la semana para confirmar de un vistazo.
 *
 * @param semana Semana en minutos.
 * @return Resumen tipo `Lun a Vie 9 a 19 · Sáb 9 a 14 · Dom cerrado`.
 */
export function resumenSemana(semana: SemanaUI): string
{
  const partes: string[] = [];
  let i = 0;

  while (i < DAY_ORDER.length)
  {
    const day = DAY_ORDER[i];
    const actual = serializarDia(semana[day]);
    let j = i;

    while (j + 1 < DAY_ORDER.length && serializarDia(semana[DAY_ORDER[j + 1]]) === actual)
    {
      j += 1;
    }

    const etiquetaDias = i === j ? etiquetaDiaCorta(day) : `${etiquetaDiaCorta(day)} a ${etiquetaDiaCorta(DAY_ORDER[j])}`;
    const franjas = semana[day];

    if (franjas.length === 0)
    {
      partes.push(`${etiquetaDias} cerrado`);
    }
    else
    {
      partes.push(`${etiquetaDias} ${franjas.map(resumirFranja).join(" y ")}`);
    }

    i = j + 1;
  }

  if (partes.length === 1 && semana[DAY_ORDER[0]].length === 0)
  {
    return "Todo cerrado";
  }

  return partes.join(" · ");
}

/**
 * Etiqueta corta del día (`Lun`, `Mar`...).
 *
 * @param day Clave del día.
 * @return Etiqueta de 3 letras.
 */
function etiquetaDiaCorta(day: DayKey): string
{
  switch (day)
  {
    case "lun":
    {
      return "Lun";
    }
    case "mar":
    {
      return "Mar";
    }
    case "mié":
    {
      return "Mié";
    }
    case "jue":
    {
      return "Jue";
    }
    case "vie":
    {
      return "Vie";
    }
    case "sáb":
    {
      return "Sáb";
    }
    case "dom":
    {
      return "Dom";
    }
  }
}
