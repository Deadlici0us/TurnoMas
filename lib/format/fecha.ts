/**
 * Formato de fechas en es-AR sin depender del ICU del entorno.
 *
 * Los client components se hidratan contra HTML renderizado en Node: si
 * usamos `toLocaleDateString("es-AR")` el navegador puede caer a en-US y
 * producir un mismatch. Estas funciones fijan el mismo texto en ambos lados.
 */

export const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
export const DIAS_LARGOS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;
export const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/**
 * Fecha corta `DD/MM/YYYY`.
 *
 * @param fecha Fecha a formatear.
 * @return Fecha numérica o cadena vacía si la fecha es inválida.
 */
export function formatearFechaCorta(fecha: Date): string
{
  if (Number.isNaN(fecha.getTime()))
  {
    return "";
  }

  const dos = (n: number): string => String(n).padStart(2, "0");

  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/**
 * Fecha con día de la semana y mes abreviado, ej. `mar, 20 oct`.
 *
 * @param fecha Fecha a formatear.
 * @return Etiqueta corta en es-AR.
 */
export function formatearDiaYMes(fecha: Date): string
{
  if (Number.isNaN(fecha.getTime()))
  {
    return "";
  }

  return `${DIAS_CORTOS[fecha.getDay()] ?? ""}, ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()] ?? ""}`;
}

/**
 * Fecha larga con día de la semana, ej. `martes, 20 oct`.
 *
 * @param fecha Fecha a formatear.
 * @return Etiqueta larga en es-AR.
 */
export function formatearDiaLargoYMes(fecha: Date): string
{
  if (Number.isNaN(fecha.getTime()))
  {
    return "";
  }

  return `${DIAS_LARGOS[fecha.getDay()] ?? ""}, ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()] ?? ""}`;
}
