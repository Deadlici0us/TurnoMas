/**
 * Recordatorios antes del turno (Módulo 5): decide si corresponde enviar
 * el recordatorio de un turno aún no notificado.
 *
 * La ventana es configurable por negocio (`negocios.recordatorio_hs`,
 * default 24). Función pura para facilitar TDD; el Route Handler llamado
 * por QStash la usará para filtrar turnos próximos.
 */

export interface TurnoParaRecordar
{
  readonly inicio: Date;
  readonly notificacionEnviada: boolean;
}

export const RECORDATORIO_DEFAULT_HS = 24;
export const RECORDATORIO_MIN_HS = 1;
export const RECORDATORIO_MAX_HS = 72;

/** Normaliza la ventana de recordatorio del negocio (default 24hs). */
export function resolverRecordatorioHs(valor: unknown): number
{
  if (typeof valor !== "number" || !Number.isFinite(valor))
  {
    return RECORDATORIO_DEFAULT_HS;
  }

  const entero = Math.floor(valor);

  if (entero < RECORDATORIO_MIN_HS || entero > RECORDATORIO_MAX_HS)
  {
    return RECORDATORIO_DEFAULT_HS;
  }

  return entero;
}

/** Indica si corresponde enviar el recordatorio dentro de la ventana. */
export function shouldSendReminder(
  turno: TurnoParaRecordar,
  ahora: Date,
  ventanaHs: number = RECORDATORIO_DEFAULT_HS,
): boolean
{
  if (turno.notificacionEnviada)
  {
    return false;
  }

  const diffMs = turno.inicio.getTime() - ahora.getTime();

  return diffMs > 0 && diffMs <= resolverRecordatorioHs(ventanaHs) * 3_600_000;
}
