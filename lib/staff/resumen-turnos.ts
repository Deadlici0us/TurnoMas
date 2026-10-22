/** Fila mínima de turno necesaria para resumir el historial de un profesional. */
export interface TurnoResumenRow
{
  readonly staff_id?: unknown;
  readonly inicio?: unknown;
  readonly fin?: unknown;
  readonly estado?: unknown;
}

/** Conteo de turnos de un profesional. */
export interface ResumenTurnosStaff
{
  readonly total: number;
  readonly proximos: number;
}

/** Estados que todavía representan un turno por atender. */
const ESTADOS_PROXIMOS: ReadonlySet<string> = new Set(["pendiente", "confirmado", "pagado"]);

/** Indica si una fecha ISO es válida. */
function fechaValida(valor: unknown): Date | null
{
  if (typeof valor !== "string" || valor.length === 0)
  {
    return null;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Agrupa los turnos por profesional y separa el total del historial de los próximos.
 *
 * Un turno es próximo si su fin es posterior a `ahora` y su estado sigue activo.
 *
 * @param turnos Filas de turnos del negocio.
 * @param ahora Instante de referencia (inyectable para tests).
 * @return Mapa de `staff_id` a conteos.
 */
export function calcularResumenTurnosPorStaff(
  turnos: ReadonlyArray<TurnoResumenRow>,
  ahora: Date = new Date(),
): Map<string, ResumenTurnosStaff>
{
  const resumen = new Map<string, ResumenTurnosStaff>();

  for (const turno of turnos)
  {
    if (typeof turno.staff_id !== "string" || turno.staff_id.length === 0)
    {
      continue;
    }

    const actual = resumen.get(turno.staff_id) ?? { total: 0, proximos: 0 };
    const fin = fechaValida(turno.fin) ?? fechaValida(turno.inicio);
    const esProximo = fin !== null
      && fin.getTime() > ahora.getTime()
      && typeof turno.estado === "string"
      && ESTADOS_PROXIMOS.has(turno.estado);

    resumen.set(turno.staff_id, {
      total: actual.total + 1,
      proximos: actual.proximos + (esProximo ? 1 : 0),
    });
  }

  return resumen;
}
