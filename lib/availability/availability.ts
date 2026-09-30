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
