/**
 * Validación pura del negocio.
 *
 * Espeja el `check (char_length(nombre) between 2 and 80)` de
 * `supabase/migrations/0000_init.sql`. El `slug` no se edita: es el link
 * público (`/:pais/:slug`) y cambiarlo rompería reservas compartidas.
 */

import { limpiarControl } from "@/lib/validation/texto";

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;
const DESCRIPCION_MAXIMA = 300;

/** Valida y recorta el nombre del negocio (2 a 80 caracteres). */
export function validarNombreNegocio(nombre: unknown): string
{
  if (typeof nombre !== "string")
  {
    throw new RangeError("El nombre del negocio tiene que ser texto.");
  }

  const value = limpiarControl(nombre);

  if (value.length < NOMBRE_MINIMO || value.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del negocio tiene que tener entre 2 y 80 caracteres.");
  }

  return value;
}

/**
 * Valida la descripción breve del negocio (máx. 300 caracteres).
 *
 * @param descripcion Texto crudo (vacío = sin descripción).
 * @return Descripción limpia o null.
 */
export function validarDescripcionNegocio(descripcion: unknown): string | null
{
  if (descripcion === null || descripcion === undefined)
  {
    return null;
  }

  if (typeof descripcion !== "string")
  {
    throw new RangeError("La descripción del negocio tiene que ser texto.");
  }

  const value = limpiarControl(descripcion);

  if (value.length === 0)
  {
    return null;
  }

  if (value.length > DESCRIPCION_MAXIMA)
  {
    throw new RangeError(`La descripción no puede superar los ${DESCRIPCION_MAXIMA} caracteres.`);
  }

  return value;
}
