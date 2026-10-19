/**
 * Formato de moneda del dashboard (centavos → pesos).
 *
 * Fuente única para las vistas que muestran montos de turnos/servicios.
 */

/**
 * Agrupa los miles de un entero con punto (sin regex ni backtracking).
 *
 * @param entero Número entero positivo.
 * @return Dígitos agrupados de a tres, ej. `15000` → `15.000`.
 */
function agruparMiles(entero: number): string
{
  const digitos = String(entero);
  const partes: string[] = [];

  for (let fin = digitos.length; fin > 0; fin -= 3)
  {
    partes.unshift(digitos.slice(Math.max(0, fin - 3), fin));
  }

  return partes.join(".");
}

/**
 * Formatea centavos como pesos argentinos sin decimales.
 *
 * No usa `Intl` a propósito: el símbolo de moneda y el agrupado dependen del
 * ICU del entorno (Node renderiza `ARS 130`, el navegador `$ 130`). Se fija
 * un formato propio (`$ 15.000`) para que servidor, tests y cliente coincidan.
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

  const pesos = Math.round(centavos / 100);
  const signo = pesos < 0 ? "-" : "";

  return `${signo}$ ${agruparMiles(Math.abs(pesos))}`;
}
