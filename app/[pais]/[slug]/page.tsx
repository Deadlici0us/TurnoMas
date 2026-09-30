import { notFound } from "next/navigation";

import BookingFlow from "@/components/booking-flow";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getDemoBusiness } from "@/lib/portal/demo-business";
import type { PortalBusiness } from "@/lib/portal/demo-business";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";

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
    .select("id, nombre, pais, slug, horarios, timezone")
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
  const [{ data: staff }, { data: servicios }] = await Promise.all([
    supabase.from("portal_staff").select("id, nombre, horarios").eq("negocio_id", negocio.id),
    supabase.from("portal_servicios").select("id, nombre, duracion_min, precio_base," +
      " precio_promocional, sena_requerida, sena_porcentaje").eq("negocio_id", negocio.id),
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
    horarios: asHorarios(negocioRow.horarios),
    staff: ((staff ?? []) as unknown as Row[]).map((s) => ({
      id: asString(s.id),
      nombre: asString(s.nombre),
      horarios: ((s.horarios ?? {}) as Record<string, string>),
      activo: true,
    })),
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
  };
}

export default async function PortalPage({ params }: { params: Promise<PortalParams> })
{
  const { pais, slug } = await params;

  const business = resolveAuthMode() === "demo"
    ? getDemoBusiness(pais, slug)
    : await getSupabaseBusiness(pais, slug);

  if (business === null)
  {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg w-full mx-auto px-4 py-8">
        <BookingFlow
          negocioNombre={business.nombre}
          pais={business.pais}
          slug={business.slug}
          staff={business.staff}
          servicios={business.servicios}
          turnos={business.turnos}
          bloqueos={business.bloqueos}
          horariosNegocio={business.horarios}
        />
        <p className="text-xs text-slate-400 text-center mt-4">Reservas por TurnoMas</p>
      </div>
    </div>
  );
}
