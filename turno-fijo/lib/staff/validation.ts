/**
 * Validación pura del equipo (staff) del negocio.
 *
 * Espeja los `check` de `supabase/migrations/0000_init.sql` para fallar
 * rápido en la Server Action con mensajes en es-AR.
 */

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;

/** Valida y recorta el nombre de un profesional (2 a 80 caracteres). */
export function validarNombreStaff(nombre: unknown): string
{
  if (typeof nombre !== "string")
  {
    throw new RangeError("El nombre del profesional tiene que ser texto.");
  }

  const value = nombre.trim();

  if (value.length < NOMBRE_MINIMO || value.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del profesional tiene que tener entre 2 y 80 caracteres.");
  }

  return value;
}
