/**
 * Validación pura del negocio.
 *
 * Espeja el `check (char_length(nombre) between 2 and 80)` de
 * `supabase/migrations/0000_init.sql`. El `slug` no se edita: es el link
 * público (`/:pais/:slug`) y cambiarlo rompería reservas compartidas.
 */

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;

/** Valida y recorta el nombre del negocio (2 a 80 caracteres). */
export function validarNombreNegocio(nombre: unknown): string
{
  if (typeof nombre !== "string")
  {
    throw new RangeError("El nombre del negocio tiene que ser texto.");
  }

  const value = nombre.trim();

  if (value.length < NOMBRE_MINIMO || value.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del negocio tiene que tener entre 2 y 80 caracteres.");
  }

  return value;
}
