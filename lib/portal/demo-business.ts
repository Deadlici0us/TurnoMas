/**
 * Negocio demo para el portal público (Módulo 2) y el dashboard.
 *
 * Envuelve el seed (`lib/seed/demo-rows`) en una forma serializable
 * apta para pasar de Server Components a Client Components.
 */

import { buildDemoSeed, DEMO_NEGOCIO_ID as SEED_NEGOCIO_ID } from "@/lib/seed/demo-rows";

export interface PortalStaff
{
  readonly id: string;
  readonly nombre: string;
  readonly horarios: Record<string, string>;
  readonly activo: boolean;
  readonly fotoUrl?: string | null;
  readonly descripcion?: string | null;
}

/** Par profesional ↔ servicio que brinda. */
export interface PortalAsociacion
{
  readonly staffId: string;
  readonly servicioId: string;
}

export interface PortalServicio
{
  readonly id: string;
  readonly nombre: string;
  readonly duracionMin: number;
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

/** Bloqueo del negocio (Google Calendar): ocupa a todo el equipo. */
export interface PortalBloqueo
{
  readonly inicio: string;
  readonly fin: string;
}

export interface PortalBusiness
{
  readonly nombre: string;
  readonly pais: string;
  readonly slug: string;
  readonly timezone: string;
  readonly logoUrl: string | null;
  readonly descripcion: string | null;
  readonly googleMapsUrl: string | null;
  readonly horarios: Record<string, string>;
  readonly staff: readonly PortalStaff[];
  readonly servicios: readonly PortalServicio[];
  readonly asociaciones: readonly PortalAsociacion[];
  readonly turnos: readonly PortalTurno[];
  readonly bloqueos: readonly PortalBloqueo[];
  /** El negocio exige email al reservar (tiene reseñas o recordatorios activos). */
  readonly requiereEmail?: boolean;
}

/** ID fijo del negocio demo en el seed y la DB. */
export const DEMO_NEGOCIO_ID = SEED_NEGOCIO_ID;

/** País del portal demo. */
export const DEMO_PAIS = "ar";

/** Slug del portal demo. */
export const DEMO_SLUG = "negocio-demo";

const DEMO_DUENIO_ID = "demo-duenio";

/** Indica si la ruta pública corresponde al negocio demo. */
export function esNegocioDemo(pais: string, slug: string): boolean
{
  return pais.toLowerCase() === DEMO_PAIS && slug.toLowerCase() === DEMO_SLUG;
}

/** Devuelve el negocio demo (Negocio Demo) o null si no coincide país/slug. */
export function getDemoBusiness(pais: string, slug: string): PortalBusiness | null
{
  if (!esNegocioDemo(pais, slug))
  {
    return null;
  }

  const seed = buildDemoSeed(DEMO_DUENIO_ID);

  return {
    nombre: seed.negocio.nombre,
    pais: seed.negocio.pais,
    slug: seed.negocio.slug,
    timezone: seed.negocio.timezone,
    logoUrl: null,
    descripcion: seed.negocio.descripcion,
    googleMapsUrl: seed.negocio.google_maps_url,
    horarios: Object.fromEntries(
      Object.entries(seed.negocio.horarios).map(([day, ranges]) => [day, ranges.join(", ")]),
    ),
    staff: seed.staff.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      horarios: s.horarios,
      activo: true,
      fotoUrl: s.foto_url,
      descripcion: s.descripcion,
    })),
    asociaciones: seed.staffServicios.map((par) => ({
      staffId: par.staff_id,
      servicioId: par.servicio_id,
    })),
    servicios: seed.servicios.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      duracionMin: s.duracion_min,
      precioBase: s.precio_base,
      precioPromocional: s.precio_promocional,
      senaRequerida: s.sena_requerida,
      senaPorcentaje: s.sena_porcentaje,
    })),
    turnos: seed.turnos.map((t) => ({ staffId: t.staff_id, servicioId: t.servicio_id, inicio: t.inicio })),
    bloqueos: [],
  };
}
