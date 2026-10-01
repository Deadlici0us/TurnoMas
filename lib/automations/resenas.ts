/**
 * Recolector de reseñas (Módulo 5): pide calificación 2h post-turno.
 * 4-5 estrellas derivan a Google Maps; 1-3 generan feedback interno.
 *
 * Funciones puras para facilitar TDD y reutilización en
 * Route Handlers llamados por QStash.
 */

export interface TurnoParaResena
{
  readonly fin: Date;
  readonly resenaPedida: boolean;
}

export type DestinoResena = "google-maps" | "feedback-interno";

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

/** Resuelve el destino de la reseña según las estrellas. */
export function resolveReviewDestination(estrellas: number): DestinoResena
{
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5)
  {
    throw new RangeError("Las estrellas deben ser un entero entre 1 y 5.");
  }

  return estrellas >= 4 ? "google-maps" : "feedback-interno";
}
