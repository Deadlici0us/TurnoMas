/**
 * Reserva pública del portal (Módulo 2): crea cliente + turno pendiente,
 * aplica lista negra y devuelve checkout de seña cuando corresponde.
 *
 * Flujo server-side: valida input → resuelve negocio/staff/servicio por
 * vistas portal → evalúa lista negra con service role → verifica
 * disponibilidad (duración + buffer) → inserta turno → crea preferencia MP.
 */

import { NextResponse } from "next/server";

import { evaluateCustomer } from "@/lib/blacklist/blacklist";
import type { BlacklistPenalty } from "@/lib/blacklist/blacklist";
import { isSlotAvailable } from "@/lib/availability/availability";
import { getBlockedInterval } from "@/lib/availability/availability";
import { construirICS, construirLinkGoogleCalendar } from "@/lib/automatizaciones/ics";
import { resolveCheckout } from "@/lib/checkout/checkout";
import { readEnv } from "@/lib/env/env";
import { QStashAdapter } from "@/lib/ports/jobs";
import { calcularMontosReserva } from "@/lib/reservas/montos";
import { paymentService } from "@/lib/services/payment";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const WHATSAPP_PATTERN = /^\+?[\d\s-]{7,}$/;
const NOMBRE_MINIMO = 2;

interface ReservaBody
{
  readonly pais: unknown;
  readonly slug: unknown;
  readonly staffId: unknown;
  readonly servicioId: unknown;
  readonly inicio: unknown;
  readonly nombre: unknown;
  readonly whatsapp: unknown;
}

function exigirTexto(valor: unknown, mensaje: string): string
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    throw new RangeError(mensaje);
  }

  return valor.trim();
}

function exigirNombre(valor: unknown): string
{
  const nombre = exigirTexto(valor, "Contanos tu nombre para confirmar la reserva.");

  if (nombre.length < NOMBRE_MINIMO)
  {
    throw new RangeError("Contanos tu nombre para confirmar la reserva.");
  }

  return nombre.slice(0, 80);
}

function exigirWhatsapp(valor: unknown): string
{
  const whatsapp = exigirTexto(valor, "Revisá tu WhatsApp para que te lleguen los recordatorios.");

  if (!WHATSAPP_PATTERN.test(whatsapp))
  {
    throw new RangeError("Revisá tu WhatsApp para que te lleguen los recordatorios.");
  }

  return whatsapp;
}

function exigirInicio(valor: unknown): Date
{
  if (typeof valor !== "string")
  {
    throw new RangeError("Elegí un horario válido para tu reserva.");
  }

  const inicio = new Date(valor);

  if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now())
  {
    throw new RangeError("Elegí un horario válido para tu reserva.");
  }

  return inicio;
}

export async function POST(request: Request)
{
  let body: ReservaBody;

  try
  {
    body = (await request.json()) as ReservaBody;
  }
  catch
  {
    return NextResponse.json({ error: "No pudimos leer tu reserva. Probá de nuevo." }, { status: 400 });
  }

  let pais: string;
  let slug: string;
  let staffId: string;
  let servicioId: string;
  let nombre: string;
  let whatsapp: string;
  let inicio: Date;

  try
  {
    pais = exigirTexto(body.pais, "Falta el país del negocio.").toLowerCase();
    slug = exigirTexto(body.slug, "Falta el negocio.").toLowerCase();
    staffId = exigirTexto(body.staffId, "Elegí un profesional para tu reserva.");
    servicioId = exigirTexto(body.servicioId, "Elegí un servicio para tu reserva.");
    nombre = exigirNombre(body.nombre);
    whatsapp = exigirWhatsapp(body.whatsapp);
    inicio = exigirInicio(body.inicio);
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Revisá los datos de tu reserva." },
      { status: 400 },
    );
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: negocio } = await supabase.from("portal_negocios")
      .select("id, nombre, pais, slug").eq("pais", pais).eq("slug", slug).single();

    if (negocio === null)
    {
      return NextResponse.json({ error: "No encontramos ese negocio." }, { status: 404 });
    }

    const negocioId = negocio.id as string;
    const [{ data: staff }, { data: servicio }] = await Promise.all([
      supabase.from("portal_staff").select("id, nombre, horarios")
        .eq("negocio_id", negocioId).eq("id", staffId).single(),
      supabase.from("portal_servicios")
        .select("id, nombre, duracion_min, buffer_limpieza_min, precio_base," +
          " precio_promocional, sena_requerida, sena_porcentaje")
        .eq("negocio_id", negocioId).eq("id", servicioId).single(),
    ]);

    if (staff === null || servicio === null)
    {
      return NextResponse.json({ error: "Ese profesional o servicio ya no está disponible." },
        { status: 404 });
    }

    const admin = getSupabaseAdmin();
    const { data: negocioFull } = await admin.from("negocios")
      .select("id, blacklist_umbral, blacklist_penalidad").eq("id", negocioId).single();

    const { data: clienteExistente } = await admin.from("clientes").select("id, ausencias")
      .eq("negocio_id", negocioId).eq("whatsapp", whatsapp).single();

    const ausencias = typeof clienteExistente?.ausencias === "number" ? clienteExistente.ausencias : 0;
    const umbral = typeof negocioFull?.blacklist_umbral === "number" ? negocioFull.blacklist_umbral : 2;
    const penalidad = (negocioFull?.blacklist_penalidad as BlacklistPenalty | undefined)
      ?? "fullDeposit";
    const decision = evaluateCustomer(ausencias, { maxAllowedAbsences: umbral, penaltyOnExceed: penalidad });

    const servicioRow = servicio as unknown as {
      nombre: string; duracion_min: number; buffer_limpieza_min: number; precio_base: number;
      precio_promocional: number | null; sena_requerida: boolean; sena_porcentaje: number;
    };
    const outcome = resolveCheckout({
      serviceRequiresDeposit: servicioRow.sena_requerida,
      serviceDepositPercentage: servicioRow.sena_porcentaje,
      blacklistDecision: decision,
    });

    if (outcome.kind === "rejected")
    {
      return NextResponse.json({ success: false, outcome }, { status: 403 });
    }

    const montos = calcularMontosReserva({
      precioBase: servicioRow.precio_base,
      precioPromocional: servicioRow.precio_promocional,
      senaRequerida: servicioRow.sena_requerida,
      senaPorcentaje: servicioRow.sena_porcentaje,
      senaForzadaPorListaNegra: decision === "fullDeposit",
    });

    const { data: turnosExistentes } = await admin.from("turnos").select("inicio, servicio_id")
      .eq("negocio_id", negocioId).eq("staff_id", staffId).gte("inicio", new Date().toISOString());
    const { data: serviciosTodos } = await admin.from("servicios")
      .select("id, duracion_min, buffer_limpieza_min").eq("negocio_id", negocioId);
    const duracionPorServicio = new Map((serviciosTodos ?? []).map((s: {
      id: string; duracion_min: number; buffer_limpieza_min: number;
    }) => [s.id, s]));
    const bloqueos = ((turnosExistentes ?? []) as Array<{ inicio: string; servicio_id: string }>).map((t) =>
    {
      const ref = duracionPorServicio.get(t.servicio_id);

      return getBlockedInterval(new Date(t.inicio),
        ref?.duracion_min ?? servicioRow.duracion_min,
        ref?.buffer_limpieza_min ?? servicioRow.buffer_limpieza_min);
    });

    const ocupado = !isSlotAvailable(inicio, servicioRow.duracion_min,
      servicioRow.buffer_limpieza_min, bloqueos);

    if (ocupado)
    {
      return NextResponse.json({ error: "Ese horario se acaba de ocupar. Elegí otro." }, { status: 409 });
    }

    let clienteId: string;

    if (clienteExistente !== null && typeof clienteExistente.id === "string")
    {
      clienteId = clienteExistente.id;
      await admin.from("clientes").update({ nombre }).eq("id", clienteId);
    }
    else
    {
      const { data: nuevo, error: clienteError } = await admin.from("clientes")
        .insert({ negocio_id: negocioId, nombre, whatsapp, ausencias: 0 }).select("id").single();

      if (clienteError !== null || nuevo === null)
      {
        return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." },
          { status: 500 });
      }

      clienteId = nuevo.id as string;
    }

    const fin = new Date(inicio.getTime()
      + (servicioRow.duracion_min + servicioRow.buffer_limpieza_min) * 60_000);
    const conSena = outcome.kind === "payDeposit";
    const { data: turno, error: turnoError } = await admin.from("turnos").insert({
      negocio_id: negocioId,
      staff_id: staffId,
      servicio_id: servicioId,
      cliente_id: clienteId,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      estado: conSena ? "pendiente" : "pagado",
      monto_total: montos.montoTotal,
      sena_monto: montos.senaMonto,
      sena_porcentaje: montos.senaPorcentaje,
    }).select("id").single();

    if (turnoError !== null || turno === null)
    {
      return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." },
        { status: 500 });
    }

    const turnoId = turno.id as string;
    const servicioNombre = servicioRow.nombre ?? "tu servicio";
    const staffNombre = (staff as unknown as { nombre?: string }).nombre ?? "tu profesional";
    const tituloEvento = `${servicioNombre} en ${negocio.nombre as string}`;
    const gcalUrl = construirLinkGoogleCalendar({
      titulo: tituloEvento,
      inicio,
      fin,
      descripcion: `Reserva TurnoFijo · ${servicioNombre} con ${staffNombre}`,
      ubicacion: negocio.nombre as string,
    });
    const ics = construirICS({
      titulo: tituloEvento,
      inicio,
      fin,
      descripcion: `Reserva TurnoFijo · ${servicioNombre} con ${staffNombre}`,
      ubicacion: negocio.nombre as string,
    });

    if (!conSena)
    {
      return NextResponse.json({ success: true, turnoId, outcome, montoTotal: montos.montoTotal,
        gcalUrl, ics });
    }

    let checkoutUrl: string | null = null;
    let checkoutError: string | null = null;

    try
    {
      const preference = await paymentService.createDepositPreferenceForNegocio(negocioId, turnoId,
        montos.montoTotal, montos.senaPorcentaje, `Seña ${negocio.nombre as string}`);

      checkoutUrl = preference.initPoint;
    }
    catch
    {
      // El turno ya existe como pendiente: el cliente reintenta el pago
      // y el antifantasma lo libera si no se paga en 15 minutos.
      checkoutError = "No pudimos generar el link de pago. Probá de nuevo en unos segundos.";
    }

    try
    {
      const base = readEnv("NEXT_PUBLIC_APP_URL") ?? (readEnv("VERCEL_URL") !== null
        ? `https://${readEnv("VERCEL_URL") as string}` : null);

      if (base !== null)
      {
        await new QStashAdapter().schedule({
          url: `${base.replace(/\/+$/, "")}/api/cron/antifantasma`,
          delaySeconds: 900,
          body: { turnoId },
        });
      }
    }
    catch
    {
      // Best-effort: la reserva ya existe aunque QStash no esté configurado.
    }

    return NextResponse.json({
      success: true,
      turnoId,
      outcome,
      montoTotal: montos.montoTotal,
      senaMonto: montos.senaMonto,
      checkoutUrl,
      checkoutError,
      gcalUrl,
      ics,
    });
  }
  catch (error)
  {
    const mensaje = error instanceof Error ? error.message : "";

    if (mensaje.includes("Supabase"))
    {
      return NextResponse.json({ error: "Reserva no disponible en modo demo." }, { status: 503 });
    }

    return NextResponse.json({ error: "No pudimos guardar tu reserva. Probá de nuevo." }, { status: 500 });
  }
}
