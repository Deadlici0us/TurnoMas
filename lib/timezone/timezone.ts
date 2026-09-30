/**
 * Zona horaria por negocio (fix agenda lista vs grilla).
 *
 * Los turnos se guardan en UTC (`timestamptz`); la hora visible siempre se
 * calcula en la zona del negocio, nunca en la del server ni en la del browser.
 * Un país no alcanza (MX/BR/US/ES tienen varios husos), por eso la zona vive
 * en `negocios.timezone` y el país solo es fallback para datos legacy.
 */

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Fallback solo para negocios creados antes de la migración 0005. */
export const TIMEZONE_FALLBACK_POR_PAIS: Readonly<Record<string, string>> =
{
  ar: "America/Argentina/Buenos_Aires",
  mx: "America/Mexico_City",
  es: "Europe/Madrid",
  br: "America/Sao_Paulo",
  cl: "America/Santiago",
  co: "America/Bogota",
  pe: "America/Lima",
  uy: "America/Montevideo",
  py: "America/Asuncion",
};

/** Lista curada para el selector de Config (suficiente para operar). */
export const TIMEZONES_SOPORTADAS: readonly string[] =
[
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "America/Cancun",
  "America/Tijuana",
  "America/New_York",
  "Europe/Madrid",
  "Europe/London",
];

export interface PartesCiviles
{
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
  readonly hora: number;
  readonly minuto: number;
  readonly weekday: number;
}

export interface DiaCivil
{
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
}

function weekdayEnANumero(raw: string): number
{
  switch (raw.toLowerCase().slice(0, 3))
  {
    case "sun":
    {
      return 0;
    }
    case "mon":
    {
      return 1;
    }
    case "tue":
    {
      return 2;
    }
    case "wed":
    {
      return 3;
    }
    case "thu":
    {
      return 4;
    }
    case "fri":
    {
      return 5;
    }
    case "sat":
    {
      return 6;
    }
    default:
    {
      return 1;
    }
  }
}

/**
 * Valida una zona IANA.
 *
 * @param value Zona candidata.
 * @return La zona validada.
 */
export function validarTimezone(value: unknown): string
{
  if (typeof value !== "string" || value.trim().length === 0)
  {
    throw new RangeError("La zona horaria tiene que ser una zona IANA (ej. America/Mexico_City).");
  }

  const zona = value.trim();

  try
  {
    new Intl.DateTimeFormat("en-US", { timeZone: zona }).format(new Date());
  }
  catch
  {
    throw new RangeError(`Zona horaria inválida: ${zona}.`);
  }

  return zona;
}

/**
 * Resuelve la zona efectiva del negocio.
 *
 * @param input Timezone explícito y país como fallback legacy.
 * @return Zona IANA a usar para mostrar la agenda.
 */
export function resolverTimezoneNegocio(input: { readonly timezone?: unknown; readonly pais?: unknown }): string
{
  const { timezone, pais } = input;

  if (typeof timezone === "string" && timezone.trim().length > 0)
  {
    try
    {
      return validarTimezone(timezone);
    }
    catch
    {
      // Sigue al fallback por país.
    }
  }

  if (typeof pais === "string" && pais.trim().length > 0)
  {
    const fallback = TIMEZONE_FALLBACK_POR_PAIS[pais.trim().toLowerCase()];

    if (typeof fallback === "string")
    {
      return fallback;
    }
  }

  return DEFAULT_TIMEZONE;
}

function aFecha(valor: Date | string): Date | null
{
  const fecha = typeof valor === "string" ? new Date(valor) : valor;

  return fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

/**
 * Partes civiles de un instante en una zona (día/hora que ve el negocio).
 *
 * @param fecha Instante absoluto (UTC).
 * @param timeZone Zona IANA del negocio.
 * @return Partes civiles en esa zona.
 */
export function obtenerPartesCiviles(fecha: Date, timeZone: string): PartesCiviles
{
  const zona = validarTimezone(timeZone);
  const partes = new Intl.DateTimeFormat("en-US",
  {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(fecha);
  const get = (tipo: string): string => partes.find((p) => p.type === tipo)?.value ?? "";

  return {
    anio: Number(get("year")),
    mes: Number(get("month")),
    dia: Number(get("day")),
    hora: Number(get("hour")) % 24,
    minuto: Number(get("minute")),
    weekday: weekdayEnANumero(get("weekday")),
  };
}

/**
 * Minutos desde medianoche en la zona del negocio (posición vertical).
 *
 * @param fecha Instante absoluto.
 * @param timeZone Zona IANA del negocio.
 * @return Minutos 0-1439 en hora civil del negocio.
 */
export function minutosEnZona(fecha: Date, timeZone: string): number
{
  const partes = obtenerPartesCiviles(fecha, timeZone);

  return partes.hora * 60 + partes.minuto;
}

/**
 * Clave civil YYYY-MM-DD en la zona del negocio (agrupar por día).
 *
 * @param fecha Instante absoluto.
 * @param timeZone Zona IANA del negocio.
 * @return Clave `YYYY-MM-DD` del día civil del negocio.
 */
export function claveDiaEnZona(fecha: Date, timeZone: string): string
{
  const zona = validarTimezone(timeZone);

  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(fecha);
}

/**
 * Formatea un turno en hora del negocio (lista de agenda, emails).
 *
 * @param valor Instante ISO o Date.
 * @param timeZone Zona IANA del negocio.
 * @return `DD/MM HH:mm` en hora civil, o el raw si es inválido.
 */
export function formatearEnZona(valor: Date | string, timeZone: string): string
{
  const fecha = aFecha(valor);

  if (fecha === null)
  {
    return typeof valor === "string" ? valor : String(valor);
  }

  const dos = (n: number): string => String(n).padStart(2, "0");
  const partes = obtenerPartesCiviles(fecha, timeZone);

  return `${dos(partes.dia)}/${dos(partes.mes)} ${dos(partes.hora)}:${dos(partes.minuto)}`;
}

/**
 * Suma días calendario a un día civil (sin depender de DST).
 *
 * @param dia Día civil base.
 * @param delta Días a sumar (puede ser negativo).
 * @return Día civil resultante.
 */
export function sumarDiasCiviles(dia: DiaCivil, delta: number): DiaCivil
{
  const base = new Date(Date.UTC(dia.anio, dia.mes - 1, dia.dia + delta));

  return { anio: base.getUTCFullYear(), mes: base.getUTCMonth() + 1, dia: base.getUTCDate() };
}

/**
 * Lunes civil de la semana que contiene a `base` en la zona dada.
 *
 * @param base Instante de referencia.
 * @param timeZone Zona IANA del negocio.
 * @return Día civil del lunes.
 */
export function inicioSemanaCivil(base: Date, timeZone: string): DiaCivil
{
  const partes = obtenerPartesCiviles(base, timeZone);
  const desfase = (partes.weekday + 6) % 7;

  return sumarDiasCiviles({ anio: partes.anio, mes: partes.mes, dia: partes.dia }, -desfase);
}

/**
 * Clave YYYY-MM-DD de un día civil.
 *
 * @param dia Día civil.
 * @return Clave comparable.
 */
export function claveDeDiaCivil(dia: DiaCivil): string
{
  const dos = (n: number): string => String(n).padStart(2, "0");

  return `${dia.anio}-${dos(dia.mes)}-${dos(dia.dia)}`;
}
