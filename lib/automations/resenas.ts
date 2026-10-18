/**
 * Recolector de reseñas (Módulo 5): pide calificación 2h post-turno.
 *
 * El email invita a TODOS a escribir la reseña en Google (link directo) y, de
 * forma opcional, a dejar feedback privado (sin gating por estrellas).
 *
 * Funciones puras para facilitar TDD y reutilización en
 * Route Handlers llamados por QStash.
 */

export interface TurnoParaResena
{
  readonly fin: Date;
  readonly resenaPedida: boolean;
}

export const RESENA_DEFAULT_HS = 2;
export const RESENA_MIN_HS = 1;
export const RESENA_MAX_HS = 72;

/** Normaliza la demora de pedido de reseña del negocio (default 2hs). */
export function resolverResenaHs(valor: unknown): number
{
  if (typeof valor !== "number" || !Number.isFinite(valor))
  {
    return RESENA_DEFAULT_HS;
  }

  const entero = Math.floor(valor);

  if (entero < RESENA_MIN_HS || entero > RESENA_MAX_HS)
  {
    return RESENA_DEFAULT_HS;
  }

  return entero;
}

/** Indica si corresponde pedir la reseña tras la demora configurada. */
export function shouldAskReview(
  turno: TurnoParaResena,
  ahora: Date,
  demoraHs: number = RESENA_DEFAULT_HS,
): boolean
{
  if (turno.resenaPedida)
  {
    return false;
  }

  return ahora.getTime() - turno.fin.getTime() >= resolverResenaHs(demoraHs) * 3_600_000;
}

/** Indica si un valor es una calificación válida de 1 a 5 estrellas. */
export function esEstrellasValidas(valor: unknown): valor is number
{
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}
