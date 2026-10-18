/**
 * Saneo de texto libre para inputs (defensa en profundidad).
 *
 * Elimina caracteres de control (incluye `\n`, `\r`, `\t`) y colapsa espacios.
 * Evita inyección de headers en emails y valores "sucios" en general. Función
 * pura para TDD.
 */

/**
 * Limpia caracteres de control y colapsa espacios.
 *
 * @param texto Texto crudo del usuario.
 * @return Texto sin caracteres de control y con espacios colapsados.
 */
export function limpiarControl(texto: string): string
{
  return texto
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
