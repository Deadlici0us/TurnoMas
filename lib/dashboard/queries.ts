"use server";

import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

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

/** Datos del dashboard: negocio + staff + servicios + clientes + turnos. */
export async function getDashboardData()
{
  let supabase: Awaited<ReturnType<typeof getSupabaseServer>>;

  try
  {
    supabase = await getSupabaseServer();
  }
  catch
  {
    redirect("/login");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    redirect("/login");
  }

  const admin = getSupabaseAdmin();

  const { data: negocio, error: negocioError } = await admin
    .from("negocios")
    .select("*")
    .eq("duenio_id", user.id)
    .single();

  if (negocioError !== null || negocio === null)
  {
    if (negocioError === null || negocioError.code === "PGRST116")
    {
      redirect("/onboarding");
    }

    throw new Error("No pudimos cargar tu negocio. Probá de nuevo.");
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
    userEmail: user.email ?? null,
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
