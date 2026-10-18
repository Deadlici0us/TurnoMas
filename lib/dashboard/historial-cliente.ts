/**
 * Historial de servicios de un cliente (Módulo 4: ficha de cliente).
 *
 * Funciones puras para TDD: filtran y ordenan los turnos de un cliente y
 * calculan el resumen que muestra la ficha. No conocen Supabase ni React.
 */

export interface TurnoHistorial
{
  readonly id: string;
  readonly cliente_id: string;
  readonly servicio_id: string;
  readonly staff_id: string;
  readonly inicio: string;
  readonly estado: string;
  readonly monto_total: number | null;
  readonly sena_monto: number | null;
}

export interface ResumenHistorial
{
  readonly total: number;
  readonly completados: number;
  readonly ausentes: number;
  readonly cancelados: number;
  readonly totalFacturado: number;
  readonly totalSenas: number;
}

/** Estados en los que la seña ya fue efectivamente cobrada. */
const ESTADOS_CON_SENA_COBRADA: ReadonlySet<string> = new Set(["pagado", "completado", "ausente"]);

function tiempoDeInicio(turno: TurnoHistorial): number
{
  const tiempo = new Date(turno.inicio).getTime();

  return Number.isNaN(tiempo) ? 0 : tiempo;
}

/**
 * Devuelve los turnos de un cliente, del más reciente al más antiguo.
 *
 * @param turnos Turnos del negocio (cualquier cliente).
 * @param clienteId Cliente cuyo historial se quiere.
 * @return Turnos del cliente ordenados por `inicio` descendente.
 */
export function construirHistorialCliente(
  turnos: readonly TurnoHistorial[],
  clienteId: string,
): TurnoHistorial[]
{
  return turnos
    .filter((turno) => turno.cliente_id === clienteId)
    .slice()
    .sort((a, b) => tiempoDeInicio(b) - tiempoDeInicio(a));
}

/**
 * Resume un historial de turnos: conteos y montos en centavos.
 *
 * `totalFacturado` suma los `monto_total` de turnos `completado`;
 * `totalSenas` suma las señas cobradas (pagado, completado, ausente).
 *
 * @param historial Turnos del cliente.
 * @return Conteos por estado y totales en centavos.
 */
export function resumirHistorial(historial: readonly TurnoHistorial[]): ResumenHistorial
{
  let completados = 0;
  let ausentes = 0;
  let cancelados = 0;
  let totalFacturado = 0;
  let totalSenas = 0;

  for (const turno of historial)
  {
    if (turno.estado === "completado")
    {
      completados += 1;
      totalFacturado += turno.monto_total ?? 0;
    }

    if (turno.estado === "ausente")
    {
      ausentes += 1;
    }

    if (turno.estado === "cancelado")
    {
      cancelados += 1;
    }

    if (ESTADOS_CON_SENA_COBRADA.has(turno.estado))
    {
      totalSenas += turno.sena_monto ?? 0;
    }
  }

  return {
    total: historial.length,
    completados,
    ausentes,
    cancelados,
    totalFacturado,
    totalSenas,
  };
}
