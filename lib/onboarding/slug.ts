/**
 * Slug y URL pública del negocio (Módulo 1): `/:pais/:slug`.
 *
 * Funciones puras para facilitar TDD y reutilización
 * en Server Components y Server Actions.
 */

const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/;
const MAX_SLUG_LENGTH = 60;

/**
 * Recorta guiones de ambos bordes.
 * S8786: bucle lineal en vez de /^-+|-+$/ con alternancia super-lineal.
 */
function recortarGuiones(valor: string): string
{
  let inicio = 0;
  let fin = valor.length;

  while (inicio < fin && valor[inicio] === "-")
  {
    inicio += 1;
  }

  while (fin > inicio && valor[fin - 1] === "-")
  {
    fin -= 1;
  }

  return valor.slice(inicio, fin);
}

/**
 * Recorta guiones del final (tras truncar el slug).
 * S8786: bucle lineal en vez de /-+$/ super-lineal.
 */
function recortarGuionesFinales(valor: string): string
{
  let fin = valor.length;

  while (fin > 0 && valor[fin - 1] === "-")
  {
    fin -= 1;
  }

  return valor.slice(0, fin);
}

/** Normaliza el nombre del negocio a un slug apto para URL. */
export function slugifyBusinessName(nombre: string): string
{
  const compacto = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  const sinBordes = recortarGuiones(compacto);
  const slug = recortarGuionesFinales(sinBordes.slice(0, MAX_SLUG_LENGTH));

  if (slug.length === 0)
  {
    throw new RangeError("El nombre del negocio debe contener caracteres válidos para la URL.");
  }

  return slug;
}

/** Construye la URL pública del portal de reservas `/:pais/:slug`. */
export function buildBusinessUrl(pais: string, nombre: string): string
{
  const normalizedCountry = pais.trim().toLowerCase();

  if (!COUNTRY_CODE_PATTERN.test(normalizedCountry))
  {
    throw new RangeError("El país debe ser un código de 2 letras (ej. ar, mx).");
  }

  return `/${normalizedCountry}/${slugifyBusinessName(nombre)}`;
}
