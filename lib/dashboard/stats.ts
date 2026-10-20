/**
 * Totales del dashboard calculados en memoria (demo temporal).
 *
 * Vive fuera de `queries.ts` porque ese módulo es `"use server"` y solo
 * puede exportar funciones async.
 */

/** Contadores del dashboard por estado + ingresos de señas cobradas. */
export interface DashboardStats
{
  readonly pendientes: number;
  readonly confirmados: number;
  readonly pagados: number;
  readonly completados: number;
  readonly ausentes: number;
  readonly cancelados: number;
  readonly totalIngresos: number;
}

/**
 * Calcula los contadores del dashboard sin consultar la base.
 *
 * @param turnos Turnos del seed o de la DB.
 * @return Conteos por estado e ingresos por señas cobradas.
 */
export function calcularStatsDesdeTurnos(
  turnos: ReadonlyArray<{ readonly estado?: unknown; readonly sena_monto?: unknown }>,
): DashboardStats
{
  const stats = {
    pendientes: 0,
    confirmados: 0,
    pagados: 0,
    completados: 0,
    ausentes: 0,
    cancelados: 0,
    totalIngresos: 0,
  };

  for (const turno of turnos)
  {
    if (turno.estado === "pendiente") stats.pendientes += 1;
    if (turno.estado === "confirmado") stats.confirmados += 1;
    if (turno.estado === "completado") stats.completados += 1;
    if (turno.estado === "ausente") stats.ausentes += 1;
    if (turno.estado === "cancelado") stats.cancelados += 1;

    if (turno.estado === "pagado")
    {
      stats.pagados += 1;
      stats.totalIngresos += typeof turno.sena_monto === "number" ? turno.sena_monto : 0;
    }
  }

  return stats;
}
