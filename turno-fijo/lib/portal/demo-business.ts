/**
 * Negocio demo para el portal público (Módulo 2) y el dashboard.
 *
 * Envuelve el seed (`lib/seed/demo-rows`) en una forma serializable
 * apta para pasar de Server Components a Client Components.
 */

import { buildDemoSeed } from "@/lib/seed/demo-rows";

export interface PortalStaff
{
  readonly id: string;
  readonly nombre: string;
  readonly horarios: Record<string, string>;
  readonly activo: boolean;
}

export interface PortalServicio
{
  readonly id: string;
  readonly nombre: string;
  readonly duracionMin: number;
  readonly bufferLimpiezaMin: number;
  readonly precioBase: number;
  readonly precioPromocional: number | null;
  readonly senaRequerida: boolean;
  readonly senaPorcentaje: number;
}

export interface PortalTurno
{
  readonly staffId: string;
  readonly servicioId: string;
  readonly inicio: string;
}

export interface PortalBusiness
{
  readonly nombre: string;
  readonly pais: string;
  readonly slug: string;
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly turnos: readonly PortalTurno[];
}

const DEMO_DUENIO_ID = "demo-duenio";

/** Devuelve el negocio demo (Barbería Diego) o null si no coincide país/slug. */
export function getDemoBusiness(pais: string, slug: string): PortalBusiness | null
{
  if (pais.toLowerCase() !== "ar" || slug.toLowerCase() !== "barberia-diego")
  {
    return null;
  }

  const seed = buildDemoSeed(DEMO_DUENIO_ID);

  return {
    nombre: seed.negocio.nombre,
    pais: seed.negocio.pais,
    slug: seed.negocio.slug,
    staff: seed.staff.map((s) => ({ id: s.id, nombre: s.nombre, horarios: s.horarios, activo: true })),
    servicios: seed.servicios.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      duracionMin: s.duracion_min,
      bufferLimpiezaMin: s.buffer_limpieza_min,
      precioBase: s.precio_base,
      precioPromocional: s.precio_promocional,
      senaRequerida: s.sena_requerida,
      senaPorcentaje: s.sena_porcentaje,
    })),
    turnos: seed.turnos.map((t) => ({ staffId: t.staff_id, servicioId: t.servicio_id, inicio: t.inicio })),
  };
}
