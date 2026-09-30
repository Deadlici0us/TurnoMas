/**
 * Estados de turno (Módulo 3): transiciones permitidas en la agenda.
 *
 * Semántica:
 * - `pendiente`: con seña, esperando pago de MercadoPago.
 * - `confirmado`: sin seña, reserva confirmada con $0 cobrado (se paga
 *   presencial o al completar). No es un pago.
 * - `pagado`: seña efectivamente cobrada (webhook o marca manual).
 *
 * Función pura para TDD. Solo el dueño muta estados vía Server Actions;
 * los finales (completado, ausente, cancelado) son irreversibles porque
 * alimentan ausencias, ingresos y lista negra.
 */

export type EstadoTurno = "pendiente" | "confirmado" | "pagado" | "completado" | "cancelado" | "ausente";

const ESTADOS_FINALES: readonly EstadoTurno[] = ["completado", "ausente", "cancelado"];

const TRANSICIONES: Record<EstadoTurno, readonly EstadoTurno[]> = {
  pendiente: ["pagado", "cancelado"],
  confirmado: ["completado", "ausente", "cancelado"],
  pagado: ["completado", "ausente", "cancelado"],
  completado: [],
  ausente: [],
  cancelado: [],
};

/** Valida una transición; lanza en español si no está permitida. */
export function validarTransicionTurno(actual: EstadoTurno, nuevo: EstadoTurno): boolean
{
  if ((ESTADOS_FINALES as readonly string[]).includes(actual))
  {
    throw new RangeError("Ese turno ya está cerrado y no se puede modificar.");
  }

  if (actual === "pendiente" && (nuevo === "completado" || nuevo === "ausente"))
  {
    throw new RangeError("No se puede marcar ausente un turno sin cobrar.");
  }

  if (!(TRANSICIONES[actual] as readonly string[]).includes(nuevo))
  {
    throw new RangeError("Esa transición de estado no está permitida.");
  }

  return true;
}
