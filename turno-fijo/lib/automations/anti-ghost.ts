/**
 * Escudo anti-fantasmas (Módulo 5): libera la agenda cuando una reserva
 * con seña no registra pago dentro de la ventana de gracia (defecto 15 min).
 *
 * Función pura para facilitar TDD; el Route Handler llamado por QStash
 * la usará para decidir qué turnos eliminar.
 */

export interface UnpaidBooking
{
  readonly createdAt: Date;
  readonly paymentRegistered: boolean;
}

const MS_PER_MINUTE = 60_000;
const DEFAULT_GRACE_MINUTES = 15;

/** Indica si una reserva impaga venció y debe liberarse. */
export function shouldReleaseBooking(
  booking: UnpaidBooking,
  now: Date,
  graceMinutes: number = DEFAULT_GRACE_MINUTES,
): boolean
{
  if (!Number.isFinite(graceMinutes) || graceMinutes <= 0)
  {
    throw new RangeError("La gracia debe ser un número positivo de minutos.");
  }

  if (booking.paymentRegistered)
  {
    return false;
  }

  const elapsedMs = now.getTime() - booking.createdAt.getTime();

  if (elapsedMs < 0)
  {
    return false;
  }

  return elapsedMs >= graceMinutes * MS_PER_MINUTE;
}
