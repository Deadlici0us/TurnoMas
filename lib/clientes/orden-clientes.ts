/**
 * Ordena clientes alfabéticamente por nombre.
 *
 * Usa la configuración regional española y sensibilidad base para que
 * mayúsculas y acentos no alteren el orden esperado.
 *
 * @param clientes Clientes a ordenar.
 * @return Nueva lista ordenada sin mutar la original.
 */
export function ordenarClientesPorNombre<T extends { readonly nombre: string }>(
  clientes: readonly T[],
): T[]
{
  return [...clientes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}
