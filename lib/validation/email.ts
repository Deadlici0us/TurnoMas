/**
 * Valida un email sin expresiones regulares con backtracking.
 *
 * Criterio pragmático para el portal: parte local con caracteres habituales,
 * dominio con etiquetas válidas y TLD alfabético de al menos 2 letras. Rechaza
 * llaves, espacios y puntos mal ubicados que antes pasaban y rompían el envío.
 */

const MAX_TOTAL = 254;
const MAX_LOCAL = 64;
const MAX_DOMINIO = 253;
const MAX_ETIQUETA = 63;
const MIN_TLD = 2;
const MAX_TLD = 63;
const CARACTERES_DE_CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
const MENSAJE_EMAIL_INVALIDO =
  "El email no puede tener espacios ni caracteres inválidos (ej: nombre@dominio.com).";

/**
 * Indica si un carácter pertenece a la parte local admitida.
 *
 * @param caracter Carácter a evaluar.
 * @return Verdadero para letras, dígitos y separadores habituales.
 */
function esCaracterLocalPermitido(caracter: string): boolean
{
  return (caracter >= "a" && caracter <= "z")
    || (caracter >= "A" && caracter <= "Z")
    || (caracter >= "0" && caracter <= "9")
    || caracter === "."
    || caracter === "_"
    || caracter === "%"
    || caracter === "+"
    || caracter === "-";
}

/**
 * Indica si una etiqueta del dominio es válida.
 *
 * @param etiqueta Etiqueta sin puntos.
 * @return Verdadero cuando no está vacía, no empieza/termina con guion y
 *     solo contiene letras, dígitos o guiones.
 */
function esEtiquetaDominioValida(etiqueta: string): boolean
{
  if (etiqueta.length === 0 || etiqueta.length > MAX_ETIQUETA)
  {
    return false;
  }

  if (etiqueta.startsWith("-") || etiqueta.endsWith("-"))
  {
    return false;
  }

  for (const caracter of etiqueta)
  {
    const esLetra = (caracter >= "a" && caracter <= "z") || (caracter >= "A" && caracter <= "Z");
    const esDigito = caracter >= "0" && caracter <= "9";

    if (!esLetra && !esDigito && caracter !== "-")
    {
      return false;
    }
  }

  return true;
}

/**
 * Indica si el TLD es alfabético y tiene un largo razonable.
 *
 * @param tld Última etiqueta del dominio.
 * @return Verdadero para TLD de 2 a 63 letras.
 */
function esTldValido(tld: string): boolean
{
  if (tld.length < MIN_TLD || tld.length > MAX_TLD)
  {
    return false;
  }

  for (const caracter of tld)
  {
    const esLetra = (caracter >= "a" && caracter <= "z") || (caracter >= "A" && caracter <= "Z");

    if (!esLetra)
    {
      return false;
    }
  }

  return true;
}

/**
 * Valida la parte local del email.
 *
 * @param local Texto antes de la arroba.
 * @return Verdadero cuando cumple largo y caracteres admitidos.
 */
function esLocalValido(local: string): boolean
{
  if (local.length === 0 || local.length > MAX_LOCAL)
  {
    return false;
  }

  if (local.startsWith(".") || local.endsWith(".") || local.includes(".."))
  {
    return false;
  }

  for (const caracter of local)
  {
    if (!esCaracterLocalPermitido(caracter))
    {
      return false;
    }
  }

  return true;
}

/**
 * Valida el dominio del email.
 *
 * @param dominio Texto después de la arroba.
 * @return Verdadero cuando tiene al menos dos etiquetas y un TLD válido.
 */
function esDominioValido(dominio: string): boolean
{
  if (dominio.length === 0 || dominio.length > MAX_DOMINIO)
  {
    return false;
  }

  const etiquetas = dominio.split(".");

  if (etiquetas.length < 2)
  {
    return false;
  }

  if (!etiquetas.every(esEtiquetaDominioValida))
  {
    return false;
  }

  return esTldValido(etiquetas[etiquetas.length - 1] as string);
}

/**
 * Valida la forma de un email antes de guardarlo o enviarlo.
 *
 * @param email Texto a validar.
 * @return `true` si el email tiene una forma aceptable para el portal.
 */
export function esEmailValido(email: string): boolean
{
  if (email.length === 0 || email.length > MAX_TOTAL)
  {
    return false;
  }

  if (/\s/.test(email))
  {
    return false;
  }

  const arroba = email.indexOf("@");

  if (arroba <= 0 || arroba !== email.lastIndexOf("@") || arroba === email.length - 1)
  {
    return false;
  }

  return esLocalValido(email.slice(0, arroba)) && esDominioValido(email.slice(arroba + 1));
}

/**
 * Normaliza y valida el email de un cliente.
 *
 * Recorta espacios externos, pasa a minúsculas y rechaza caracteres de
 * control, espacios internos y cualquier carácter fuera del formato admitido.
 * No trunca emails largos: si supera el máximo, lo informa.
 *
 * @param valor Valor crudo del formulario o de la base.
 * @return Email normalizado o null cuando el campo queda vacío.
 * @throws RangeError cuando el email no es válido.
 */
export function normalizarEmailCliente(valor: unknown): string | null
{
  if (valor === null || valor === undefined)
  {
    return null;
  }

  if (typeof valor !== "string")
  {
    throw new RangeError(MENSAJE_EMAIL_INVALIDO);
  }

  const texto = valor.trim();

  if (texto.length === 0)
  {
    return null;
  }

  if (texto.length > MAX_TOTAL)
  {
    throw new RangeError("El email no puede superar los 254 caracteres.");
  }

  if (CARACTERES_DE_CONTROL.test(texto))
  {
    throw new RangeError(MENSAJE_EMAIL_INVALIDO);
  }

  const email = texto.toLowerCase();

  if (!esEmailValido(email))
  {
    throw new RangeError(MENSAJE_EMAIL_INVALIDO);
  }

  return email;
}
