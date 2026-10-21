/**
 * Motor de disponibilidad: bloquea la duración del servicio.
 *
 * Las funciones son puras para facilitar TDD y reutilización
 * en Server Components, Route Handlers y Server Actions.
 */

export interface BlockedInterval
{
  readonly start: Date;
  readonly end: Date;
}

const MS_PER_MINUTE = 60_000;

/** Calcula el intervalo total bloqueado por un turno. */
export function getBlockedInterval(start: Date, serviceMinutes: number): BlockedInterval
{
  const end = new Date(start.getTime() + serviceMinutes * MS_PER_MINUTE);

  return { start, end };
}

/**
 * Calcula el intervalo bloqueado por un turno usando su fin real.
 *
 * El `fin` persistido manda aunque la duración actual del servicio haya
 * cambiado; la duración del servicio queda como fallback para turnos legacy.
 *
 * @param start Inicio del turno.
 * @param end Fin real del turno, o null cuando no está disponible.
 * @param fallbackMinutes Duración de respaldo en minutos.
 * @return Intervalo que ocupa la agenda.
 */
export function getTurnoBlockedInterval(
  start: Date,
  end: Date | null,
  fallbackMinutes: number,
): BlockedInterval
{
  const finValido = end !== null
    && !Number.isNaN(end.getTime())
    && end.getTime() > start.getTime();

  return finValido ? { start, end } : getBlockedInterval(start, fallbackMinutes);
}

/** Indica si dos intervalos bloqueados se solapan (los contiguos no solapan). */
export function intervalsOverlap(a: BlockedInterval, b: BlockedInterval): boolean
{
  return a.start < b.end && b.start < a.end;
}

/** Indica si un turno candidato cabe sin solapar bloqueos existentes. */
export function isSlotAvailable(
  candidateStart: Date,
  serviceMinutes: number,
  existingBlocked: readonly BlockedInterval[],
): boolean
{
  const candidate = getBlockedInterval(candidateStart, serviceMinutes);

  return existingBlocked.every((blocked) => !intervalsOverlap(candidate, blocked));
}
