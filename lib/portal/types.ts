/**
 * Tipos serializables del portal público de reservas.
 *
 * Se comparten entre Server Components y Client Components sin acoplarse
 * a la fuente de datos (Supabase).
 */

export interface PortalStaff
{
  readonly id: string;
  readonly nombre: string;
  readonly horarios: Record<string, unknown>;
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
  readonly fin: string | null;
}

/** Bloqueo del negocio que ocupa a todo el equipo. */
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
}
