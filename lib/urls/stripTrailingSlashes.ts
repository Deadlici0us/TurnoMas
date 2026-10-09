/**
 * Elimina las barras finales de una URL o ruta sin usar regex con backtracking.
 *
 * @param value Cadena de entrada.
 * @return Cadena sin `/` finales.
 */
export function stripTrailingSlashes(value: string): string
{
  let end = value.length;

  while (end > 0 && value[end - 1] === "/")
  {
    end -= 1;
  }

  return value.slice(0, end);
}

/**
 * Elimina comillas simples/dobles al inicio y fin sin regex con backtracking.
 *
 * @param value Cadena de entrada.
 * @return Cadena sin comillas envolventes.
 */
export function stripSurroundingQuotes(value: string): string
{
  let start = 0;
  let end = value.length;

  while (start < end && (value[start] === '"' || value[start] === "'"))
  {
    start += 1;
  }

  while (end > start && (value[end - 1] === '"' || value[end - 1] === "'"))
  {
    end -= 1;
  }

  return value.slice(start, end);
}
