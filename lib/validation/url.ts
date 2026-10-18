/**
 * Saneo de URLs para `href`/`src` (defensa XSS).
 *
 * Solo permite `http`/`https`. Descarta esquemas peligrosos
 * (`javascript:`, `data:`, `vbscript:`, `file:`…) y valores inválidos.
 * Función pura para TDD.
 */

/**
 * Devuelve una URL externa segura o null.
 *
 * @param valor Valor crudo (puede venir de la base o de un input).
 * @return URL con protocolo http(s) normalizada, o null.
 */
export function sanitizeUrlExterna(valor: unknown): string | null
{
  if (typeof valor !== "string")
  {
    return null;
  }

  const bruto = valor.trim();

  if (bruto.length === 0)
  {
    return null;
  }

  let url: URL;

  try
  {
    url = new URL(bruto);
  }
  catch
  {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:")
  {
    return null;
  }

  return url.toString();
}
