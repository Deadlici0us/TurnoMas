/**
 * Relación profesional ↔ servicios del equipo.
 *
 * Funciones puras para normalizar los servicios que brinda un profesional y
 * resolver el filtrado del portal. Espeja la tabla `staff_servicios`.
 */

/** Par profesional ↔ servicio (claves en camelCase para la app). */
export interface AsociacionStaffServicio
{
  readonly staffId: string;
  readonly servicioId: string;
}

/**
 * Valida y normaliza la lista de servicios asignados a un profesional.
 *
 * @param serviciosIds IDs crudos (puede traer duplicados o vacíos).
 * @return IDs únicos y no vacíos, sin duplicados.
 */
export function validarServiciosStaff(serviciosIds: unknown): string[]
{
  if (!Array.isArray(serviciosIds))
  {
    throw new RangeError("Los servicios del profesional tienen que ser una lista.");
  }

  const vistos = new Set<string>();
  const normalizados: string[] = [];

  for (const crudo of serviciosIds)
  {
    if (typeof crudo !== "string")
    {
      throw new RangeError("Los servicios del profesional tienen que ser IDs de texto.");
    }

    const id = crudo.trim();

    if (id.length === 0 || vistos.has(id))
    {
      continue;
    }

    vistos.add(id);
    normalizados.push(id);
  }

  return normalizados;
}

/**
 * Indica si un profesional brinda un servicio concreto.
 *
 * @param asociaciones Pares profesional ↔ servicio.
 * @param staffId ID del profesional.
 * @param servicioId ID del servicio.
 * @return Verdadero cuando existe la asociación.
 */
export function staffOfreceServicio(
  asociaciones: readonly AsociacionStaffServicio[],
  staffId: string,
  servicioId: string,
): boolean
{
  return asociaciones.some((par) => par.staffId === staffId && par.servicioId === servicioId);
}

/**
 * Devuelve los servicios que brinda un profesional, preservando el orden.
 *
 * @param servicios Catálogo completo de servicios.
 * @param asociaciones Pares profesional ↔ servicio.
 * @param staffId ID del profesional.
 * @return Servicios asociados al profesional (lista vacía si no ofrece ninguno).
 */
export function serviciosDeStaff<T extends { readonly id: string }>(
  servicios: readonly T[],
  asociaciones: readonly AsociacionStaffServicio[],
  staffId: string,
): T[]
{
  return servicios.filter((servicio) => staffOfreceServicio(asociaciones, staffId, servicio.id));
}
