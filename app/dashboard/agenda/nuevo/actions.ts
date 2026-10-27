"use server";

import { revalidatePath } from "next/cache";

import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { sincronizarTurnoConfirmado } from "@/lib/reservas/confirmacion";
import { estaOcupado } from "@/lib/reservas/disponibilidad";
import { calcularMontosReserva, tieneSenaEfectiva } from "@/lib/reservas/montos";
import { parseTurnoManualInput } from "@/lib/reservas/turno-manual";
import type { TurnoManualValidado } from "@/lib/reservas/turno-manual";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { claveDiaEnZona, instanteDesdeZonaCivil, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

interface NegocioManual
{
  readonly id: string;
  readonly nombre: string;
  readonly logoUrl: string | null;
  readonly timeZone: string;
  readonly msg_confirmacion_subject: unknown;
  readonly msg_confirmacion_cuerpo: unknown;
}

interface ServicioManual
{
  readonly servicio: {
    readonly nombre: string;
    readonly duracion_min: number;
    readonly precio_base: number;
    readonly precio_promocional: number | null;
    readonly sena_requerida: boolean;
    readonly sena_porcentaje: number;
  };
  readonly staffNombre: string;
}

/**
 * Carga el negocio con la zona horaria y las plantillas de confirmación.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @return Datos mínimos del negocio.
 */
async function cargarNegocio(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
): Promise<NegocioManual>
{
  const { data } = await admin.from("negocios")
    .select("id, nombre, logo_url, timezone, pais, msg_confirmacion_subject, msg_confirmacion_cuerpo")
    .eq("id", negocioId).single();
  const row = data as {
    id?: unknown; nombre?: unknown; logo_url?: unknown; timezone?: unknown; pais?: unknown;
    msg_confirmacion_subject?: unknown; msg_confirmacion_cuerpo?: unknown;
  } | null;

  if (row === null || typeof row.id !== "string")
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  return {
    id: row.id,
    nombre: typeof row.nombre === "string" ? row.nombre : "tu negocio",
    logoUrl: typeof row.logo_url === "string" ? row.logo_url : null,
    timeZone: resolverTimezoneNegocio({ timezone: row.timezone, pais: row.pais }),
    msg_confirmacion_subject: row.msg_confirmacion_subject ?? null,
    msg_confirmacion_cuerpo: row.msg_confirmacion_cuerpo ?? null,
  };
}

/**
 * Verifica que el profesional y el servicio pertenezcan al negocio.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param staffId ID del profesional.
 * @param servicioId ID del servicio.
 * @return Servicio validado y nombre del profesional.
 */
async function cargarServicio(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  staffId: string,
  servicioId: string,
): Promise<ServicioManual>
{
  const [{ data: staff }, { data: servicio }] = await Promise.all([
    admin.from("staff").select("id, nombre").eq("id", staffId).eq("negocio_id", negocioId).single(),
    admin.from("servicios")
      .select("id, nombre, duracion_min, precio_base, precio_promocional, sena_requerida, sena_porcentaje")
      .eq("id", servicioId).eq("negocio_id", negocioId).single(),
  ]);

  if (staff === null)
  {
    throw new NotFoundError("No encontramos ese profesional.");
  }

  if (servicio === null)
  {
    throw new NotFoundError("No encontramos ese servicio.");
  }

  return {
    servicio: servicio as unknown as ServicioManual["servicio"],
    staffNombre: typeof (staff as { nombre?: unknown }).nombre === "string"
      ? (staff as { nombre: string }).nombre
      : "Profesional",
  };
}

/**
 * Resuelve el cliente del turno: lo actualiza por id o WhatsApp, o lo crea.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param datos Campos validados del turno.
 * @return ID del cliente.
 */
async function resolverCliente(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  datos: TurnoManualValidado,
): Promise<string>
{
  const campos = { nombre: datos.nombre, whatsapp: datos.whatsapp, email: datos.email };

  if (datos.clienteId !== null)
  {
    const { data: existente } = await admin.from("clientes").select("id")
      .eq("id", datos.clienteId).eq("negocio_id", negocioId).single();

    if (existente === null)
    {
      throw new NotFoundError("No encontramos ese cliente.");
    }

    const { error } = await admin.from("clientes").update(campos).eq("id", datos.clienteId);

    if (error !== null)
    {
      throw error.code === "23505"
        ? new ConflictError("Ya existe un cliente con ese WhatsApp.")
        : new UnavailableError("No pudimos guardar el cliente. Probá de nuevo.");
    }

    return datos.clienteId;
  }

  const { data: porWhatsapp } = await admin.from("clientes").select("id")
    .eq("negocio_id", negocioId).eq("whatsapp", datos.whatsapp).single();

  if (porWhatsapp !== null && typeof (porWhatsapp as { id?: unknown }).id === "string")
  {
    const clienteId = (porWhatsapp as { id: string }).id;
    const { error } = await admin.from("clientes")
      .update({ nombre: datos.nombre, email: datos.email }).eq("id", clienteId);

    if (error !== null)
    {
      throw new UnavailableError("No pudimos guardar el cliente. Probá de nuevo.");
    }

    return clienteId;
  }

  const { data: nuevo, error } = await admin.from("clientes")
    .insert({ negocio_id: negocioId, ...campos, ausencias: 0 }).select("id").single();

  if (error !== null || nuevo === null)
  {
    throw error?.code === "23505"
      ? new ConflictError("Ya existe un cliente con ese WhatsApp.")
      : new UnavailableError("No pudimos guardar el cliente. Probá de nuevo.");
  }

  return (nuevo as { id: string }).id;
}

/**
 * Crea un turno manual del negocio del dueño autenticado.
 *
 * Estado `confirmado` (sin seña) o `pagado` (seña cobrada en efectivo, se
 * calcula con la config del servicio). Bloquea solapamientos y avisa por
 * email si el cliente tiene uno (best-effort).
 *
 * @param formData Campos del formulario de alta manual.
 * @return Clave civil `YYYY-MM-DD` del turno creado (para volver a la agenda).
 */
export async function crearTurnoManual(formData: FormData): Promise<string>
{
  const datos = parseTurnoManualInput({
    staffId: formData.get("staffId"),
    servicioId: formData.get("servicioId"),
    clienteId: formData.get("clienteId"),
    nombre: formData.get("nombre"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    inicio: formData.get("inicio"),
    fecha: formData.get("fecha"),
    hora: formData.get("hora"),
    estado: formData.get("estado"),
  });


  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cargar un turno.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);
  const negocio = await cargarNegocio(admin, negocioId);
  const { servicio, staffNombre } = await cargarServicio(admin, negocioId, datos.staffId, datos.servicioId);

  if (datos.estado === "pagado"
    && !tieneSenaEfectiva(servicio.sena_requerida, servicio.sena_porcentaje))
  {
    throw new RangeError("Ese servicio no requiere seña: el turno se crea confirmado.");
  }

  const clienteId = await resolverCliente(admin, negocioId, datos);
  const inicio = datos.inicio ?? instanteDesdeZonaCivil({
    fecha: datos.fecha ?? "",
    hora: datos.hora ?? "",
  }, negocio.timeZone);
  const fin = new Date(inicio.getTime() + servicio.duracion_min * 60_000);

  if (await estaOcupado(admin, negocioId, datos.staffId, inicio, servicio.duracion_min))
  {
    throw new ConflictError("Ese horario ya está ocupado. Elegí otro.");
  }

  const montos = calcularMontosReserva({
    precioBase: servicio.precio_base,
    precioPromocional: servicio.precio_promocional,
    senaRequerida: servicio.sena_requerida,
    senaPorcentaje: servicio.sena_porcentaje,
  });
  const conSena = datos.estado === "pagado"
    && tieneSenaEfectiva(servicio.sena_requerida, servicio.sena_porcentaje);

  const { data: turno, error } = await admin.from("turnos").insert({
    negocio_id: negocioId,
    staff_id: datos.staffId,
    servicio_id: datos.servicioId,
    cliente_id: clienteId,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
    estado: datos.estado,
    monto_total: montos.montoTotal,
    sena_monto: conSena ? montos.senaMonto : null,
    sena_porcentaje: conSena ? montos.senaPorcentaje : null,
  }).select("id").single();

  if (error !== null || turno === null)
  {
    throw new UnavailableError("No pudimos crear el turno. Probá de nuevo.");
  }

  const turnoId = (turno as { id: string }).id;

  await sincronizarTurnoConfirmado({
    negocioId,
    negocioNombre: negocio.nombre,
    negocioLogoUrl: negocio.logoUrl,
    servicioNombre: servicio.nombre,
    staffNombre,
    clienteId,
    clienteNombre: datos.nombre,
    email: datos.email,
    inicio,
    turnoId,
    timeZone: negocio.timeZone,
    plantillaSubject: negocio.msg_confirmacion_subject,
    plantillaCuerpo: negocio.msg_confirmacion_cuerpo,
  });

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard");

  return claveDiaEnZona(inicio, negocio.timeZone);
}
