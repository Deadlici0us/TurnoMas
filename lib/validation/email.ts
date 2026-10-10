/**
 * Valida un email sin expresiones regulares con backtracking.
 *
 * Misma semántica que /^[^@\s]+@[^@\s]+\.[^@\s]+$/: un solo `@`,
 * sin espacios, dominio con punto interno y etiquetas no vacías.
 *
 * @param email Texto a validar.
 * @return `true` si el texto tiene forma de email.
 */
export function esEmailValido(email: string): boolean
{
  if (email.includes(" ") || email.includes("\t") || email.includes("\n") || email.includes("\r"))
  {
    return false;
  }

  const partes = email.split("@");

  if (partes.length !== 2)
  {
    return false;
  }

  const local = partes[0] as string;
  const dominio = partes[1] as string;

  if (local.length === 0 || dominio.length === 0)
  {
    return false;
  }

  const punto = dominio.lastIndexOf(".");

  if (punto <= 0 || punto === dominio.length - 1)
  {
    return false;
  }

  return true;
}
