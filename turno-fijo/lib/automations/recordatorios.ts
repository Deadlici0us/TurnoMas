/**
 * Recordatorios 24h antes (Módulo 5): decide si corresponde enviar
 * el recordatorio de un turno aún no notificado.
 *
 * Función pura para facilitar TDD; el Route Handler llamado por QStash
 * la usará para filtrar turnos próximos.
 */

export interface TurnoParaRecordar
{
  readonly inicio: Date;
  readonly notificacionEnviada: boolean;
}

const MS_PER_HOUR = 3_600_000;
const REMINDER_WINDOW_HOURS = 24;

/** Indica si corresponde enviar el recordatorio 24h antes. */
export function shouldSendReminder(turno: TurnoParaRecordar, ahora: Date): boolean
{
  if (turno.notificacionEnviada)
  {
    return false;
  }

  const diffMs = turno.inicio.getTime() - ahora.getTime();

  return diffMs > 0 && diffMs <= REMINDER_WINDOW_HOURS * MS_PER_HOUR;
}
