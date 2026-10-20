/**
 * Reserva pública del portal (Módulo 2): crea cliente + turno
 * (pendiente con seña / confirmado sin seña),
 * aplica lista negra y devuelve checkout de seña cuando corresponde.
 *
 * Flujo server-side: valida input → resuelve negocio/staff/servicio por
 * vistas portal → evalúa lista negra con service role → verifica
 * disponibilidad (duración) → inserta turno → crea preferencia MP.
 */

import { NextResponse } from "next/server";

import { requierePagoSena } from "@/lib/checkout/checkout";
import { readEnv } from "@/lib/env/env";
import { NegocioSinMpError } from "@/lib/payments/mp-token";
import { QStashAdapter } from "@/lib/ports/jobs";
import { enviarEmailReservaPendiente, sincronizarTurnoConfirmado } from "@/lib/reservas/confirmacion";
import { estaOcupado } from "@/lib/reservas/disponibilidad";
import { esNegocioDemo } from "@/lib/portal/demo-business";
import { paymentService } from "@/lib/services/payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

import type { ReservaBody, ReservaValidada } from "./helpers";
import { evaluarRiesgo, parseReservaBody, requiereEmailObligatorio } from "./helpers";

/**
 * Resuelve el cliente existente o crea uno nuevo.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param nombre Nombre del cliente.
 * @param whatsapp WhatsApp del cliente.
 * @param email Email opcional.
 * @return ID del cliente.
 */
async function resolverCliente(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  nombre: string,
  whatsapp: string,
  email: string | null,
): Promise<string>
{
  const { data: existente } = await admin.from("clientes").select("id, ausencias")
    .eq("negocio_id", negocioId).eq("whatsapp", whatsapp).single();

  if (existente !== null && typeof (existente as { id?: unknown }).id === "string")
  {
    const clienteId = (existente as { id: string }).id;
    await admin.from("clientes").update({ nombre, ...(email !== null ? { email } : {}) })
      .eq("id", clienteId);

    return clienteId;
  }

  const { data: nuevo, error } = await admin.from("clientes")
    .insert({ negocio_id: negocioId, nombre, whatsapp, email, ausencias: 0 })
    .select("id").single();

  if (error !== null || nuevo === null)
  {
    throw new Error("No pudimos guardar tu reserva. Probá de nuevo.");
  }

  return (nuevo as { id: string }).id;
}

/**
 * Resuelve negocio, staff y servicio del portal.
 *
 * @param pais País del negocio.
 * @param slug Slug del negocio.
 * @param staffId ID del profesional.
 * @param servicioId ID del servicio.
 * @return Oferta validada con IDs.
 */
async function resolverOferta(
  pais: string,
  slug: string,
  staffId: string,
  servicioId: string,
): Promise<{
  readonly negocio: { readonly id: string; readonly nombre: string };
  readonly negocioId: string;
  readonly staff: unknown;
  readonly servicio: unknown;
} | ReturnType<typeof NextResponse.json>>
{
  const supabase = await getSupabaseServer();
  const { data: negocio, error: negocioError } = await supabase.from("portal_negocios")
    .select("id, nombre, pais, slug").eq("pais", pais).eq("slug", slug).single();

  if (negocioError !== null)
  {
    console.error("Portal negocio no resuelto:", negocioError.message, { pais, slug });
  }

  if (negocio === null)
  {
    return NextResponse.json({ error: "No encontramos ese negocio." }, { status: 404 });
  }

  const negocioId = negocio.id as string;
  const [
    { data: staff, error: staffError },
    { data: servicio, error: servicioError },
  ] = await Promise.all([
    supabase.from("portal_staff").select("id, nombre, horarios")
      .eq("negocio_id", negocioId).eq("id", staffId).single(),
    supabase.from("portal_servicios")
      .select("id, nombre, duracion_min, precio_base," +
        " precio_promocional, sena_requerida, sena_porcentaje")
      .eq("negocio_id", negocioId).eq("id", servicioId).single(),
  ]);

  if (staffError !== null)
  {
    console.error("Portal staff no resuelto:", staffError.message, { negocioId, staffId });
  }

  if (servicioError !== null)
  {
    console.error("Portal servicio no resuelto:", servicioError.message, { negocioId, servicioId });
  }

  if (staff === null || servicio === null)
  {
    return NextResponse.json({ error: "Ese profesional o servicio ya no está disponible." },
      { status: 404 });
  }

  return { negocio: negocio as { readonly id: string; readonly nombre: string }, negocioId, staff, servicio };
}

/**
 * Indica si el profesional brinda el servicio solicitado.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param staffId ID del profesional.
 * @param servicioId ID del servicio.
 * @return Verdadero cuando existe la asociación en `staff_servicios`.
 */
async function profesionalOfreceServicio(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  staffId: string,
  servicioId: string,
): Promise<boolean>
{
  const { data } = await admin.from("staff_servicios").select("staff_id")
    .eq("negocio_id", negocioId).eq("staff_id", staffId).eq("servicio_id", servicioId).limit(1);

  return Array.isArray(data) && data.length > 0;
}

/**
 * Carga el contexto del negocio para evaluar riesgo.
 *
 * @param admin Cliente admin de Supabase.
 * @param negocioId ID del negocio.
 * @param whatsapp WhatsApp del cliente.
 * @param pais País como fallback de timezone.
 * @return Negocio, zona y ausencias.
 */
async function cargarContextoNegocio(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  whatsapp: string,
  pais: string,
): Promise<{
  readonly negocioFull: unknown;
  readonly timeZone: string;
  readonly ausencias: number;
}>
{
  const { data: negocioFull } = await admin.from("negocios")
    .select("id, blacklist_umbral, blacklist_penalidad, timezone, pais, resena_activa, recordatorio_activo," +
      " msg_confirmacion_subject, msg_confirmacion_cuerpo").eq("id", negocioId).single();
  const timeZone = resolverTimezoneNegocio(
    { timezone: (negocioFull as { timezone?: unknown } | null)?.timezone,
      pais: (negocioFull as { pais?: unknown } | null)?.pais ?? pais });
  const { data: clienteExistente } = await admin.from("clientes").select("id, ausencias")
    .eq("negocio_id", negocioId).eq("whatsapp", whatsapp).single();
  const ausencias = typeof clienteExistente?.ausencias === "number" ? clienteExistente.ausencias : 0;

  return { negocioFull, timeZone, ausencias };
}

/**
 * Indica si una respuesta ya es un NextResponse (error temprano).
 *
 * @param valor Valor a inspeccionar.
 * @return Verdadero cuando es respuesta HTTP.
 */
function esRespuesta(valor: unknown): valor is ReturnType<typeof NextResponse.json>
{
  return typeof valor === "object" && valor !== null && "status" in valor;
}

/**
 * Inserta el turno en la base.
 *
 * @param admin Cliente admin de Supabase.
 * @param params Datos del turno.
 * @return ID del turno creado.
 */
async function insertarTurno(
  admin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    readonly negocioId: string;
    readonly staffId: string;
    readonly servicioId: string;
    readonly clienteId: string;
    readonly inicio: Date;
    readonly fin: Date;
    readonly conSena: boolean;
    readonly montoTotal: number;
    readonly senaMonto: number | null;
    readonly senaPorcentaje: number;
  },
): Promise<string>
{
  const { data: turno, error } = await admin.from("turnos").insert({
    negocio_id: params.negocioId,
    staff_id: params.staffId,
    servicio_id: params.servicioId,
    cliente_id: params.clienteId,
    inicio: params.inicio.toISOString(),
    fin: params.fin.toISOString(),
    estado: params.conSena ? "pendiente" : "confirmado",
    monto_total: params.montoTotal,
    sena_monto: params.senaMonto,
    sena_porcentaje: params.senaPorcentaje,
  }).select("id").single();

  if (error !== null || turno === null)
  {
    throw new Error("No pudimos guardar tu reserva. Probá de nuevo.");
  }

  return (turno as { id: string }).id;
}

/**
 * Crea el checkout de seña y programa el antifantasma (best-effort).
 *
 * @param negocioId ID del negocio.
 * @param turnoId ID del turno pendiente.
 * @param montoTotal Monto total en centavos.
 * @param senaPorcentaje Porcentaje de seña.
 * @param negocioNombre Nombre del negocio.
 * @return URL de checkout y error opcional.
 */
async function crearCheckoutConSena(
  negocioId: string,
  turnoId: string,
  montoTotal: number,
  senaPorcentaje: number,
  negocioNombre: string,
): Promise<{
  readonly checkoutUrl: string | null;
  readonly checkoutError: string | null;
  readonly sinMp: boolean;
}>
{
  let checkoutUrl: string | null = null;
  let checkoutError: string | null = null;
  let sinMp = false;

  try
  {
    const preference = await paymentService.createDepositPreferenceForNegocio(negocioId, turnoId,
      montoTotal, senaPorcentaje, `Seña ${negocioNombre}`);

    checkoutUrl = preference.initPoint;
  }
  catch (error)
  {
    if (error instanceof NegocioSinMpError)
    {
      sinMp = true;
      checkoutError = "Este negocio aún no activó el cobro online. Tu reserva quedó pendiente.";
    }
    else
    {
      checkoutError = "No pudimos generar el link de pago. Probá de nuevo en unos segundos.";
    }
  }

  try
  {
    const base = readEnv("NEXT_PUBLIC_APP_URL") ?? (readEnv("VERCEL_URL") !== null
      ? `https://${readEnv("VERCEL_URL") as string}` : null);

    if (base !== null)
    {
      await new QStashAdapter().schedule({
        url: `${stripTrailingSlashes(base)}/api/cron/antifantasma`,
        delaySeconds: 900,
        body: { turnoId },
      });
    }
  }
  catch
  {
    // Best-effort: la reserva ya existe aunque QStash no esté configurado.
  }

  return { checkoutUrl, checkoutError, sinMp };
}

interface LecturaReserva
{
  readonly ok: boolean;
  readonly validada?: ReservaValidada;
  readonly respuesta?: NextResponse;
}

/**
 * Lee y valida el cuerpo de la reserva, devolviendo la respuesta de error lista.
 *
 * @param request Solicitud entrante con el JSON de la reserva.
 * @return Datos validados o la respuesta HTTP de error a devolver.
 */
async function leerYValidarReserva(request: Request): Promise<LecturaReserva>
{
  let body: ReservaBody;

  try
  {
    body = (await request.json()) as ReservaBody;
  }
  catch
  {
    return {
      ok: false,
      respuesta: NextResponse.json({ error: "No pudimos leer tu reserva. Probá de nuevo." }, { status: 400 }),
    };
  }

  try
  {
    return { ok: true, validada: parseReservaBody(body) };
  }
  catch (error)
  {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { error: error instanceof Error ? error.message : "Revisá los datos de tu reserva." },
        { status: 400 },
      ),
    };
  }
}

/**
 * Traduce un error de persistencia de reserva a su respuesta HTTP.
 *
 * @param error Error capturado durante el alta de la reserva.
 * @return Respuesta HTTP con el mensaje correspondiente.
 */
function respuestaErrorReserva(error: unknown): NextResponse
{
  const mensaje = error instanceof Error ? error.message : "";

  if (mensaje.includes("Supabase"))
  {
    return NextResponse.json({ error: "Reserva no disponible en modo demo." }, { status: 503 });
  }

  return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." }, { status: 500 });
}

export async function POST(request: Request)
{
  const lectura = await leerYValidarReserva(request);

  if (!lectura.ok || lectura.validada === undefined)
  {
    return lectura.respuesta ?? NextResponse.json({ error: "Revisá los datos de tu reserva." }, { status: 400 });
  }

  const { pais, slug, staffId, servicioId, nombre, whatsapp, email, inicio } = lectura.validada;

  // La demo es solo para visualizar: se simula el éxito sin tocar la base.
  if (esNegocioDemo(pais, slug))
  {
    return NextResponse.json({ success: true, demo: true, turnoId: null });
  }

  try
  {
    const oferta = await resolverOferta(pais, slug, staffId, servicioId);

    if (esRespuesta(oferta))
    {
      return oferta;
    }

    const { negocio, negocioId, staff, servicio } = oferta;
    const admin = getSupabaseAdmin();

    // El profesional debe brindar el servicio elegido (vínculo del equipo).
    if (!(await profesionalOfreceServicio(admin, negocioId, staffId, servicioId)))
    {
      return NextResponse.json({ error: "Ese profesional no ofrece ese servicio." }, { status: 404 });
    }

    const { negocioFull, timeZone, ausencias } = await cargarContextoNegocio(
      admin,
      negocioId,
      whatsapp,
      pais,
    );

    // Email obligatorio cuando el negocio tiene reseñas o recordatorios activos
    // (ambos avisan al cliente por email).
    if (email === null && requiereEmailObligatorio(
      negocioFull as { resena_activa?: unknown; recordatorio_activo?: unknown } | null))
    {
      return NextResponse.json(
        { error: "Dejanos tu email para confirmar y avisarte." },
        { status: 400 },
      );
    }

    const servicioRow = servicio as unknown as {
      nombre: string; duracion_min: number; precio_base: number;
      precio_promocional: number | null; sena_requerida: boolean; sena_porcentaje: number;
    };
    const { outcome, montos, negocioRow } = evaluarRiesgo(negocioFull, ausencias, servicioRow);

    if (outcome.kind === "rejected")
    {
      return NextResponse.json({ success: false, outcome }, { status: 403 });
    }

    // Solo confirmado/pagado bloquea agenda. El pendiente solo retiene el slot
    // durante la gracia de pago (15min); vencido se libera y el antifantasma
    // lo cancela (opción A: cancelación dura, sin lista "por cobrar").
    if (await estaOcupado(admin, negocioId, staffId, inicio, servicioRow.duracion_min))
    {
      return NextResponse.json({ error: "Ese horario se acaba de ocupar. Elegí otro." }, { status: 409 });
    }

    let clienteId: string;

    try
    {
      clienteId = await resolverCliente(admin, negocioId, nombre, whatsapp, email);
    }
    catch
    {
      return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." },
        { status: 500 });
    }

    const fin = new Date(inicio.getTime() + servicioRow.duracion_min * 60_000);
    const conSena = requierePagoSena(outcome, montos.senaMonto);

    let turnoId: string;

    try
    {
      turnoId = await insertarTurno(admin, {
        negocioId,
        staffId,
        servicioId,
        clienteId,
        inicio,
        fin,
        conSena,
        montoTotal: montos.montoTotal,
        senaMonto: montos.senaMonto,
        senaPorcentaje: montos.senaPorcentaje,
      });
    }
    catch
    {
      return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." },
        { status: 500 });
    }
    const servicioNombre = servicioRow.nombre ?? "tu servicio";
    const staffNombre = (staff as unknown as { nombre?: string }).nombre ?? "tu profesional";
    // Sync App → GCal (best-effort) solo para turnos confirmados sin seña.
    // El pendiente con seña NO impacta calendario: el evento se crea al
    // acreditarse el pago (webhook o marca manual cash).
    if (!conSena)
    {
      const resultadoEmail = await sincronizarTurnoConfirmado({
        negocioId,
        negocioNombre: negocio.nombre as string,
        servicioNombre,
        staffNombre,
        clienteId,
        clienteNombre: nombre,
        whatsapp,
        email,
        inicio,
        fin,
        turnoId,
        timeZone,
        plantillaSubject: negocioRow?.msg_confirmacion_subject ?? null,
        plantillaCuerpo: negocioRow?.msg_confirmacion_cuerpo ?? null,
      });

      return NextResponse.json({
        success: true,
        turnoId,
        outcome,
        montoTotal: montos.montoTotal,
        emailEnviado: resultadoEmail.enviado,
      });
    }

    const { checkoutUrl, checkoutError, sinMp } = await crearCheckoutConSena(
      negocioId,
      turnoId,
      montos.montoTotal,
      montos.senaPorcentaje,
      negocio.nombre as string,
    );

    const resultadoEmail = email !== null
      ? await enviarEmailReservaPendiente({
        negocioId,
        negocioNombre: negocio.nombre as string,
        servicioNombre,
        staffNombre,
        clienteId,
        clienteNombre: nombre,
        email,
        inicio,
        timeZone,
        turnoId,
        checkoutUrl,
        plantillaSubject: negocioRow?.msg_confirmacion_subject ?? null,
        plantillaCuerpo: negocioRow?.msg_confirmacion_cuerpo ?? null,
      })
      : null;

    return NextResponse.json({
      success: true,
      turnoId,
      outcome,
      montoTotal: montos.montoTotal,
      senaMonto: montos.senaMonto,
      checkoutUrl,
      checkoutError,
      sinMp,
      emailEnviado: resultadoEmail?.enviado ?? false,
    });
  }
  catch (error)
  {
    return respuestaErrorReserva(error);
  }
}
