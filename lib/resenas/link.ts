/**
 * Link directo para escribir una reseña en Google (Opción B sin gating).
 *
 * Prioriza el `place_id` (`search.google.com/local/writereview?placeid=…`),
 * que lleva directo al formulario de reseña; si no, usa el link de Maps del
 * negocio; y como último recurso una búsqueda por nombre. Función pura.
 */

/**
 * Resuelve el link de reseña de Google para un negocio.
 *
 * @param placeId Place ID de Google del negocio (opcional).
 * @param mapsUrl Link de Google Maps configurado (opcional).
 * @param negocioNombre Nombre del negocio (fallback de búsqueda).
 * @return URL de Google para dejar la reseña.
 */
export function googleReviewUrl(
  placeId: string | null | undefined,
  mapsUrl: string | null | undefined,
  negocioNombre: string,
): string
{
  const id = typeof placeId === "string" ? placeId.trim() : "";

  if (id.length > 0)
  {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`;
  }

  const maps = typeof mapsUrl === "string" ? mapsUrl.trim() : "";

  if (maps.length > 0)
  {
    return maps;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(negocioNombre)}`;
}
