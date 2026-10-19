import { claveDiaEnZona } from "@/lib/timezone/timezone";

export interface TurnoMetrica
{
  readonly inicio?: unknown;
  readonly estado?: unknown;
  readonly sena_monto?: unknown;
}

export interface MetricasDia
{
  readonly turnosHoy: number;
  readonly pendientesHoy: number;
  readonly confirmadosHoy: number;
  readonly ingresosHoy: number;
}

/**
 * Convierte el inicio de un turno en fecha válida.
 *
 * @param valor Inicio crudo del turno.
 * @return Fecha válida o null.
 */
function fechaDeInicio(valor: unknown): Date | null
{
  if (typeof valor !== "string" && !(valor instanceof Date))
  {
    return null;
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Calcula los indicadores del día civil del negocio.
 *
 * @param turnos Turnos del negocio.
 * @param timeZone Zona IANA del negocio.
 * @param ahora Instante de referencia.
 * @return Conteos e ingresos de hoy.
 */
export function calcularMetricasDelDia(
  turnos: ReadonlyArray<TurnoMetrica>,
  timeZone: string,
  ahora: Date = new Date(),
): MetricasDia
{
  const claveHoy = claveDiaEnZona(ahora, timeZone);
  let turnosHoy = 0;
  let pendientesHoy = 0;
  let confirmadosHoy = 0;
  let ingresosHoy = 0;

  for (const turno of turnos)
  {
    const fecha = fechaDeInicio(turno.inicio);

    if (fecha === null || claveDiaEnZona(fecha, timeZone) !== claveHoy)
    {
      continue;
    }

    turnosHoy += 1;

    if (turno.estado === "pendiente")
    {
      pendientesHoy += 1;
    }

    if (turno.estado === "confirmado")
    {
      confirmadosHoy += 1;
    }

    if (turno.estado === "pagado" && typeof turno.sena_monto === "number")
    {
      ingresosHoy += turno.sena_monto;
    }
  }

  return { turnosHoy, pendientesHoy, confirmadosHoy, ingresosHoy };
}

/**
 * Busca el próximo turno de hoy, excluyendo cancelados y horarios pasados.
 *
 * @param turnos Turnos del negocio.
 * @param timeZone Zona IANA del negocio.
 * @param ahora Instante de referencia.
 * @return Turno próximo o null.
 */
export function buscarProximoTurnoDeHoy<T extends TurnoMetrica>(
  turnos: ReadonlyArray<T>,
  timeZone: string,
  ahora: Date = new Date(),
): T | null
{
  const claveHoy = claveDiaEnZona(ahora, timeZone);
  let proximo: T | null = null;
  let proximoInicio = Number.POSITIVE_INFINITY;

  for (const turno of turnos)
  {
    const fecha = fechaDeInicio(turno.inicio);

    if (fecha === null || turno.estado === "cancelado")
    {
      continue;
    }

    if (claveDiaEnZona(fecha, timeZone) !== claveHoy || fecha.getTime() < ahora.getTime())
    {
      continue;
    }

    if (fecha.getTime() < proximoInicio)
    {
      proximo = turno;
      proximoInicio = fecha.getTime();
    }
  }

  return proximo;
}
