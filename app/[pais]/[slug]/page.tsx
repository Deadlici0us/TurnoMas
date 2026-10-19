import { notFound } from "next/navigation";

import BookingFlow from "@/components/booking-flow";
import PortalMapa from "@/components/portal-mapa";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getDemoBusiness } from "@/lib/portal/demo-business";
import type { PortalBusiness } from "@/lib/portal/demo-business";
import { resolverUbicacionMaps } from "@/lib/portal/google-maps";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { sanitizeUrlExterna } from "@/lib/validation/url";

type Row = Record<string, unknown>;

function asString(value: unknown): string
{
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number
{
  return typeof value === "number" ? value : 0;
}

function asBoolean(value: unknown): boolean
{
  return value === true;
}

/** Normaliza los horarios JSONB del negocio a texto por día (vacío = sin configurar). */
function asHorarios(value: unknown): Record<string, string>
{
  if (typeof value !== "object" || value === null || Array.isArray(value))
  {
    return {};
  }

  const out: Record<string, string> = {};

  for (const [day, raw] of Object.entries(value as Record<string, unknown>))
  {
    if (typeof raw === "string")
    {
      out[day] = raw;
    }
    else if (Array.isArray(raw))
    {
      const franjas = raw.filter((item): item is string => typeof item === "string");

      if (franjas.length > 0)
      {
        out[day] = franjas.join(", ");
      }
    }
  }

  return out;
}

interface PortalParams
{
  readonly pais: string;
  readonly slug: string;
}

/** Resuelve el negocio contra las vistas públicas del portal. */
async function getSupabaseBusiness(pais: string, slug: string): Promise<PortalBusiness | null>
{
  let supabase;

  try
  {
    supabase = await getSupabaseServer();
  }
  catch
  {
    return null;
  }

  const { data: negocio } = await supabase
    .from("portal_negocios")
    .select("id, nombre, pais, slug, logo_url, descripcion, google_maps_url, horarios, timezone, requiere_email")
    .eq("pais", pais.toLowerCase())
    .eq("slug", slug.toLowerCase())
    .single();

  if (negocio === null)
  {
    // Fallback pre-migración 0004: la vista aún no expone `horarios`.
    const { data: legacy } = await supabase
      .from("portal_negocios")
      .select("id, nombre, pais, slug")
      .eq("pais", pais.toLowerCase())
      .eq("slug", slug.toLowerCase())
      .single();

    if (legacy === null)
    {
      return null;
    }

    return buildPortalBusiness(legacy, supabase);
  }

  return buildPortalBusiness(negocio, supabase);
}

/** Arma el negocio del portal con staff, servicios, turnos y bloqueos. */
async function buildPortalBusiness(
  negocio: { id: unknown },
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
): Promise<PortalBusiness | null>
{
  const [{ data: staff }, { data: servicios }, { data: asociaciones }] = await Promise.all([
    supabase.from("portal_staff").select("id, nombre, horarios, foto_url, descripcion")
      .eq("negocio_id", negocio.id),
    supabase.from("portal_servicios").select("id, nombre, duracion_min, precio_base," +
      " precio_promocional, sena_requerida, sena_porcentaje").eq("negocio_id", negocio.id),
    supabase.from("portal_staff_servicios").select("staff_id, servicio_id").eq("negocio_id", negocio.id),
  ]);

  // Los turnos tienen RLS solo-dueño: se leen con service role (solo servidor)
  // para calcular disponibilidad. Si falla, el portal muestra todo libre.
  let turnos: Array<{ staff_id: unknown; servicio_id: unknown; inicio: unknown }> = [];

  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("turnos").select("staff_id, servicio_id, inicio")
      .eq("negocio_id", negocio.id).gte("inicio", new Date().toISOString()).order("inicio");

    turnos = data ?? [];
  }
  catch
  {
    turnos = [];
  }

  const negocioRow = negocio as unknown as Row;

  // Ocupación del calendario del negocio (Google): fail-open, best-effort.
  let bloqueos: Array<{ inicio: string; fin: string }> = [];

  try
  {
    const { calendarService } = await import("@/lib/services/calendar");
    const ahora = new Date();
    const ocupacion = await calendarService.getBusyIntervalsForNegocio(
      negocio.id as string, ahora, new Date(ahora.getTime() + 7 * 86_400_000));

    bloqueos = ocupacion.map((b) => ({ inicio: b.start.toISOString(), fin: b.end.toISOString() }));
  }
  catch
  {
    bloqueos = [];
  }

  return {
    nombre: asString(negocioRow.nombre),
    pais: asString(negocioRow.pais),
    slug: asString(negocioRow.slug),
    timezone: resolverTimezoneNegocio({ timezone: negocioRow.timezone, pais: negocioRow.pais }),
    logoUrl: sanitizeUrlExterna(negocioRow.logo_url),
    descripcion: typeof negocioRow.descripcion === "string" && negocioRow.descripcion.trim().length > 0
      ? negocioRow.descripcion.trim()
      : null,
    googleMapsUrl: sanitizeUrlExterna(negocioRow.google_maps_url),
    horarios: asHorarios(negocioRow.horarios),
    staff: ((staff ?? []) as unknown as Row[]).map((s) => ({
      id: asString(s.id),
      nombre: asString(s.nombre),
      horarios: ((s.horarios ?? {}) as Record<string, string>),
      activo: true,
      fotoUrl: sanitizeUrlExterna(s.foto_url),
      descripcion: typeof s.descripcion === "string" && s.descripcion.trim().length > 0
        ? s.descripcion
        : null,
    })),
    asociaciones: ((asociaciones ?? []) as unknown as Row[])
      .filter((par) => typeof par.staff_id === "string" && typeof par.servicio_id === "string")
      .map((par) => ({ staffId: par.staff_id as string, servicioId: par.servicio_id as string })),
    servicios: ((servicios ?? []) as unknown as Row[]).map((s) => ({
      id: asString(s.id),
      nombre: asString(s.nombre),
      duracionMin: asNumber(s.duracion_min),
      precioBase: asNumber(s.precio_base),
      precioPromocional: (s.precio_promocional ?? null) as number | null,
      senaRequerida: asBoolean(s.sena_requerida),
      senaPorcentaje: asNumber(s.sena_porcentaje),
    })),
    turnos: turnos.map((t) => ({
      staffId: asString(t.staff_id),
      servicioId: asString(t.servicio_id),
      inicio: asString(t.inicio),
    })),
    bloqueos,
    requiereEmail: negocioRow.requiere_email === true,
  };
}

export default async function PortalPage({ params }: { readonly params: Promise<PortalParams> })
{
  const { pais, slug } = await params;

  const business = resolveAuthMode() === "demo"
    ? getDemoBusiness(pais, slug)
    : await getSupabaseBusiness(pais, slug);

  if (business === null)
  {
    notFound();
  }

  const ubicacion = await resolverUbicacionMaps(business.googleMapsUrl);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-surface">
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <BookingFlow
          negocioNombre={business.nombre}
          negocioLogoUrl={business.logoUrl}
          negocioDescripcion={business.descripcion}
          pais={business.pais}
          slug={business.slug}
          staff={business.staff}
          servicios={business.servicios}
          asociaciones={business.asociaciones}
          turnos={business.turnos}
          bloqueos={business.bloqueos}
          horariosNegocio={business.horarios}
          requiereEmail={business.requiereEmail === true}
        />
        {ubicacion !== null ? (
          <div className="mt-4">
            <PortalMapa
              lat={ubicacion.lat}
              lng={ubicacion.lng}
              nombre={business.nombre}
              href={business.googleMapsUrl}
            />
          </div>
        ) : null}
        <p className="mt-4 text-center text-xs text-muted-foreground">Reservas por TurnoMas</p>
      </div>
    </div>
  );
}
