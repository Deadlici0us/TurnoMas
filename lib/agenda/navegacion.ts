/**
 * Navegación día/semana/mes de la agenda (lógica pura, DST-safe).
 *
 * Trabaja con `DiaCivil` y las utilidades de `lib/timezone/timezone`:
 * nunca con `Date` local del browser. Valida la query `?vista=&fecha=`
 * con fallback al día en curso en la zona del negocio.
 */

import
{
  type DiaCivil,
  claveDeDiaCivil,
  inicioSemanaCivil,
  obtenerPartesCiviles,
  sumarDiasCiviles,
} from "@/lib/timezone/timezone";

export type VistaAgenda = "dia" | "semana" | "mes";

export const VISTAS_AGENDA: readonly VistaAgenda[] = ["dia", "semana", "mes"];

const CLAVE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normaliza la vista pedida por query.
 *
 * @param valor Vista candidata (`dia`, `semana`, `mes`).
 * @return Vista válida, `dia` por defecto.
 */
export function normalizarVista(valor: unknown): VistaAgenda
{
  if (valor === "semana" || valor === "mes" || valor === "dia")
  {
    return valor;
  }

  return "dia";
}

/**
 * Interpreta `YYYY-MM-DD` como día civil.
 *
 * @param valor Clave candidata.
 * @return Día civil o null si no es válida.
 */
export function diaDesdeClave(valor: unknown): DiaCivil | null
{
  if (typeof valor !== "string")
  {
    return null;
  }

  const coincidencia = CLAVE_FECHA.exec(valor.trim());

  if (coincidencia === null)
  {
    return null;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31)
  {
    return null;
  }

  const sonda = new Date(Date.UTC(anio, mes - 1, dia));

  if (sonda.getUTCFullYear() !== anio || sonda.getUTCMonth() + 1 !== mes || sonda.getUTCDate() !== dia)
  {
    return null;
  }

  return { anio, mes, dia };
}

/**
 * Día en curso en la zona del negocio.
 *
 * @param ahora Instante de referencia.
 * @param timeZone Zona IANA del negocio.
 * @return Día civil actual del negocio.
 */
export function diaEnCurso(ahora: Date, timeZone: string): DiaCivil
{
  const referencia = ahora instanceof Date && !Number.isNaN(ahora.getTime()) ? ahora : new Date();
  const partes = obtenerPartesCiviles(referencia, timeZone);

  return { anio: partes.anio, mes: partes.mes, dia: partes.dia };
}

/**
 * Resuelve vista + día base desde la query con fallback a hoy.
 *
 * @param query Parámetros `vista` y `fecha`.
 * @param ahora Instante de referencia.
 * @param timeZone Zona IANA del negocio.
 * @return Vista y día base normalizados.
 */
export function resolverVistaAgenda(
  query: { readonly vista?: unknown; readonly fecha?: unknown },
  ahora: Date,
  timeZone: string,
): { readonly vista: VistaAgenda; readonly base: DiaCivil }
{
  const vista = normalizarVista(query.vista);
  const pedido = diaDesdeClave(query.fecha);

  if (pedido !== null)
  {
    return { vista, base: pedido };
  }

  return { vista, base: diaEnCurso(Number.isNaN(ahora.getTime()) ? new Date() : ahora, timeZone) };
}

/**
 * Mueve el día base según la vista activa.
 *
 * @param base Día base actual.
 * @param vista Vista activa.
 * @param direccion +1 adelante, -1 atrás.
 * @return Nuevo día base.
 */
export function moverBase(base: DiaCivil, vista: VistaAgenda, direccion: 1 | -1): DiaCivil
{
  if (vista === "dia")
  {
    return sumarDiasCiviles(base, direccion);
  }

  if (vista === "semana")
  {
    return sumarDiasCiviles(base, direccion * 7);
  }

  const sonda = new Date(Date.UTC(base.anio, base.mes - 1 + direccion, 1));
  const ultimoDia = new Date(Date.UTC(sonda.getUTCFullYear(), sonda.getUTCMonth() + 1, 0)).getUTCDate();
  const dia = Math.min(base.dia, ultimoDia);

  return { anio: sonda.getUTCFullYear(), mes: sonda.getUTCMonth() + 1, dia };
}

/**
 * Los siete días (lun-dom) de la semana que contiene al día base.
 *
 * @param base Día base.
 * @param timeZone Zona IANA del negocio.
 * @return Arreglo de 7 días civiles.
 */
export function diasDeSemana(base: DiaCivil, timeZone: string): readonly DiaCivil[]
{
  const referencia = new Date(Date.UTC(base.anio, base.mes - 1, base.dia, 12));
  const lunes = inicioSemanaCivil(referencia, timeZone);

  return Array.from({ length: 7 }, (_, i) => sumarDiasCiviles(lunes, i));
}

/**
 * Celdas del mes (semanas completas lun-dom que cubren el mes base).
 *
 * @param base Día base dentro del mes a mostrar.
 * @return Arreglo de días civiles (múltiplo de 7).
 */
export function diasDeMes(base: DiaCivil): readonly DiaCivil[]
{
  const primero = { anio: base.anio, mes: base.mes, dia: 1 };
  const sonda = new Date(Date.UTC(base.anio, base.mes - 1, 1));
  const desfase = (sonda.getUTCDay() + 6) % 7;
  const inicio = sumarDiasCiviles(primero, -desfase);
  const ultimoDia = new Date(Date.UTC(base.anio, base.mes, 0)).getUTCDate();
  const total = Math.ceil((desfase + ultimoDia) / 7) * 7;

  return Array.from({ length: total }, (_, i) => sumarDiasCiviles(inicio, i));
}

/**
 * Clave `YYYY-MM-DD` del día base para la query.
 *
 * @param base Día base.
 * @return Clave comparable.
 */
export function claveDeBase(base: DiaCivil): string
{
  return claveDeDiaCivil(base);
}
