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

const MS_PER_HOUR = 3_600_000;
const REVIEW_DELAY_HOURS = 2;

/** Indica si corresponde pedir la reseña 2h después del fin. */
export function shouldAskReview(turno: TurnoParaResena, ahora: Date): boolean
{
  if (turno.resenaPedida)
  {
    return false;
  }

  return ahora.getTime() - turno.fin.getTime() >= REVIEW_DELAY_HOURS * MS_PER_HOUR;
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
