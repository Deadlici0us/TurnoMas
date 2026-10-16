/**
 * Validación pura del WhatsApp propio del negocio.
 *
 * Es la línea que ve el cliente (fase app-only, sin Meta API): se guarda
 * tal cual la escribe el dueño para mostrarla y compartirla. Espeja el
 * `check (char_length(whatsapp) between 7 and 25)` de la migración 0015.
 */

const MIN_DIGITOS = 7;
const MAX_DIGITOS = 20;
const MAX_CARACTERES = 25;

/**
 * Valida y recorta el WhatsApp del negocio (null cuando queda vacío).
 *
 * @param valor Valor crudo del formulario.
 * @return Texto recortado o null si el dueño no cargó número.
 */
export function validarWhatsappNegocio(valor: unknown): string | null
{
  if (valor === null || valor === undefined)
  {
    return null;
  }

  if (typeof valor !== "string")
  {
    throw new RangeError("El WhatsApp tiene que ser texto.");
  }

  const texto = valor.trim();

  if (texto.length === 0)
  {
    return null;
  }

  if (texto.length > MAX_CARACTERES)
  {
    throw new RangeError(`El WhatsApp no puede pasar de ${MAX_CARACTERES} caracteres.`);
  }

  const digitos = texto.replace(/\D/g, "");

  if (digitos.length < MIN_DIGITOS || digitos.length > MAX_DIGITOS)
  {
    throw new RangeError("Poné tu WhatsApp con código de área (ej: +54 9 11 1234-5678).");
  }

  return texto;
}
