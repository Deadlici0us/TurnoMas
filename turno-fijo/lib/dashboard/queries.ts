"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildDemoSeed } from "@/lib/seed/demo-rows";

const DEMO_DUENIO_ID = "demo-duenio";

/** Datos del dashboard: negocio + staff + servicios + clientes + turnos. */
export async function getDashboardData()
{
  let userId: string | null = null;

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  catch
  {
    userId = null;
  }

  // Sin sesión (build, demo local): devolver seed en memoria.
  if (userId === null)
  {
    const seed = buildDemoSeed(DEMO_DUENIO_ID);

    return {
      data: {
        negocio: seed.negocio,
        staff: seed.staff,
        servicios: seed.servicios,
        clientes: seed.clientes,
        turnos: seed.turnos,
      },
      error: null as string | null,
    };
  }

  const admin = getSupabaseAdmin();

  const { data: negocio, error: negocioError } = await admin
    .from("negocios")
    .select("*")
    .eq("duenio_id", userId)
    .single();

  if (negocioError !== null || negocio === null)
  {
    // Dueño sin negocio aún (post-register): seed en memoria para no romper UI.
    const seed = buildDemoSeed(DEMO_DUENIO_ID);

    return {
      data: {
        negocio: seed.negocio,
        staff: seed.staff,
        servicios: seed.servicios,
        clientes: seed.clientes,
        turnos: seed.turnos,
      },
      error: null as string | null,
    };
  }

  const [
    { data: staff },
    { data: servicios },
    { data: clientes },
    { data: turnos },
  ] = await Promise.all([
    admin.from("staff").select("*").eq("negocio_id", negocio.id),
    admin.from("servicios").select("*").eq("negocio_id", negocio.id),
    admin.from("clientes").select("*").eq("negocio_id", negocio.id),
    admin.from("turnos").select("*").eq("negocio_id", negocio.id).order("inicio", { ascending: false }),
  ]);

  return {
    data: {
      negocio,
      staff: staff ?? [],
      servicios: servicios ?? [],
      clientes: clientes ?? [],
      turnos: turnos ?? [],
    },
    error: null as string | null,
  };
}

/** Contadores del dashboard por estado + ingresos de señas pagadas. */
export async function getDashboardStats(negocioId: string)
{
  if (negocioId.trim().length === 0)
  {
    return { turnosHoy: 0, pendientes: 0, pagados: 0, completados: 0, ausentes: 0, cancelados: 0, totalIngresos: 0 };
  }

  try
  {
    const admin = getSupabaseAdmin();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { count: turnosHoy },
      { count: pendientes },
      { count: pagados },
      { count: completados },
      { count: ausentes },
      { count: cancelados },
      { data: pagos },
    ] = await Promise.all([
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).gte("inicio", todayStart.toISOString()),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "pendiente"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "pagado"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "completado"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "ausente"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "cancelado"),
      admin.from("turnos").select("monto_total").eq("negocio_id", negocioId).eq("estado", "pagado"),
    ]);

    const totalIngresos = (pagos ?? []).reduce((sum: number, t: { monto_total: number | null }) => sum + (t.monto_total ?? 0), 0);

    return {
      turnosHoy: turnosHoy ?? 0,
      pendientes: pendientes ?? 0,
      pagados: pagados ?? 0,
      completados: completados ?? 0,
      ausentes: ausentes ?? 0,
      cancelados: cancelados ?? 0,
      totalIngresos,
    };
  }
  catch
  {
    return { turnosHoy: 0, pendientes: 0, pagados: 0, completados: 0, ausentes: 0, cancelados: 0, totalIngresos: 0 };
  }
}
