/**
 * Formato de moneda del dashboard (centavos → pesos).
 *
 * Fuente única para las vistas que muestran montos de turnos/servicios.
 */

/**
 * Formatea centavos como pesos argentinos sin decimales.
 *
 * @param centavos Monto en centavos, o `null` si no hay monto.
 * @return Importe formateado (`$ 15.000`) o guion cuando es nulo.
 */
export function formatearARS(centavos: number | null): string
{
  if (centavos === null)
  {
    return "—";
  }

  return new Intl.NumberFormat("es-AR",
    { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(centavos / 100);
}
