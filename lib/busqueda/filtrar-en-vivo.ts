import { coincideTexto } from "@/lib/busqueda/coincide-texto";

/**
 * Filtra una lista en memoria según los campos que devuelve el selector.
 *
 * @param items Lista original.
 * @param consulta Texto escrito por la persona usuaria.
 * @param obtenerCampos Campos buscables de cada item.
 * @return Nueva lista filtrada sin mutar la original.
 */
export function filtrarEnVivo<T>(
  items: readonly T[],
  consulta: string,
  obtenerCampos: (item: T) => readonly (string | null | undefined)[],
): T[]
{
  if (consulta.trim().length === 0)
  {
    return [...items];
  }

  return items.filter((item) => coincideTexto(obtenerCampos(item), consulta));
}
