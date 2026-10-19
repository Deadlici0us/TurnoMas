"use server";

import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildDemoSeed } from "@/lib/seed/demo-rows";

const DEMO_DUENIO_ID = "demo-duenio";

/** Par profesional ↔ servicio en camelCase para la UI. */
interface AsociacionStaffServicio
{
  readonly staffId: string;
  readonly servicioId: string;
}

/** Normaliza las filas de `staff_servicios` a la forma de la UI. */
function asociacionesDeFilas(
  filas: ReadonlyArray<{ readonly staff_id: unknown; readonly servicio_id: unknown }> | null,
): AsociacionStaffServicio[]
{
  return (filas ?? [])
    .filter((fila) => typeof fila.staff_id === "string" && typeof fila.servicio_id === "string")
    .map((fila) => ({ staffId: fila.staff_id as string, servicioId: fila.servicio_id as string }));
}

/** Datos del dashboard: negocio + staff + servicios + clientes + turnos + `isDemo`. */
export async function getDashboardData()
{
  let userId: string | null = null;
  let userEmail: string | null = null;

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    userEmail = user?.email ?? null;
  }
  catch
  {
    userId = null;
    userEmail = null;
  }

  // Sin sesión (build, demo local): seed en memoria, siempre solo lectura.
  const isDemo = userId === null || isDemoOwner({ userId, email: userEmail });

  if (userId === null)
  {
    const seed = buildDemoSeed(DEMO_DUENIO_ID);

    return {
      data: {
        negocio: seed.negocio,
        staff: seed.staff,
        servicios: seed.servicios,
        asociaciones: asociacionesDeFilas(seed.staffServicios),
        clientes: seed.clientes,
        turnos: seed.turnos,
      },
      error: null as string | null,
      isDemo,
      userEmail,
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
        asociaciones: asociacionesDeFilas(seed.staffServicios),
        clientes: seed.clientes,
        turnos: seed.turnos,
      },
      error: null as string | null,
      isDemo,
      userEmail,
    };
  }

  const [
    { data: staff },
    { data: servicios },
    { data: asociaciones },
    { data: clientes },
    { data: turnos },
  ] = await Promise.all([
    admin.from("staff").select("*").eq("negocio_id", negocio.id),
    admin.from("servicios").select("*").eq("negocio_id", negocio.id),
    admin.from("staff_servicios").select("staff_id, servicio_id").eq("negocio_id", negocio.id),
    admin.from("clientes").select("*").eq("negocio_id", negocio.id),
    admin.from("turnos").select("*").eq("negocio_id", negocio.id).order("inicio", { ascending: false }),
  ]);

  return {
    data: {
      negocio,
      staff: staff ?? [],
      servicios: servicios ?? [],
      asociaciones: asociacionesDeFilas(asociaciones as Array<{ staff_id: unknown; servicio_id: unknown }> | null),
      clientes: clientes ?? [],
      turnos: turnos ?? [],
    },
    error: null as string | null,
    isDemo,
    userEmail,
  };
}

/** Contadores del dashboard por estado + ingresos de señas cobradas. */
export async function getDashboardStats(negocioId: string)
{
  if (negocioId.trim().length === 0)
  {
    return { pendientes: 0, confirmados: 0, pagados: 0, completados: 0, ausentes: 0, cancelados: 0, totalIngresos: 0 };
  }

  try
  {
    const admin = getSupabaseAdmin();

    const [
      { count: pendientes },
      { count: confirmados },
      { count: pagados },
      { count: completados },
      { count: ausentes },
      { count: cancelados },
      { data: pagos },
    ] = await Promise.all([
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "pendiente"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "confirmado"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "pagado"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "completado"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "ausente"),
      admin.from("turnos").select("*", { count: "exact", head: true }).eq("negocio_id", negocioId).eq("estado", "cancelado"),
      admin.from("turnos").select("sena_monto").eq("negocio_id", negocioId).eq("estado", "pagado"),
    ]);

    const totalIngresos = (pagos ?? []).reduce((sum: number, t: { sena_monto: number | null }) => sum + (t.sena_monto ?? 0), 0);

    return {
      pendientes: pendientes ?? 0,
      confirmados: confirmados ?? 0,
      pagados: pagados ?? 0,
      completados: completados ?? 0,
      ausentes: ausentes ?? 0,
      cancelados: cancelados ?? 0,
      totalIngresos,
    };
  }
  catch
  {
    return { pendientes: 0, confirmados: 0, pagados: 0, completados: 0, ausentes: 0, cancelados: 0, totalIngresos: 0 };
  }
}
