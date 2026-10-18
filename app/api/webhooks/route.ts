import { NextResponse } from "next/server";

import { paymentService } from "@/lib/services/payment";
import { bookingService } from "@/lib/services/booking";
import { subscriptionService } from "@/lib/services/subscription";
import { exigeFirmas, readEnv } from "@/lib/env/env";
import { MpHttpError } from "@/lib/payments/subscription";
import {
  esAltaSuscripcion,
  esCobroSuscripcion,
  esNotificacionPago,
  extraerPagoId,
  verificarFirmaMp,
} from "@/lib/webhooks/mercadopago";

function extraerFirma(request: Request): { firma: string | null; requestId: string | null; ts: string }
{
  const firma = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const params = firma !== null ? firma.split(",").map((p) => p.trim()) : [];
  const ts = params.find((p) => p.startsWith("ts="))?.slice("ts=".length) ?? requestId ?? "";

  return { firma, requestId, ts };
}

/**
 * Resuelve el estado del pago con el token del negocio primero.
 *
 * El ID de reserva viaja en external_reference del pago (fuente real),
 * no en el body del webhook que varía según tópico de MP.
 * Con señas delegadas el pago vive en la cuenta del negocio: el webhook
 * solo trae el ID del pago, así que se prueba primero con el token del
 * negocio dueño del turno (re-notificaciones), luego con el de plataforma
 * (legacy pre fail-closed) y por último iterando los negocios conectados
 * (pagos delegados nuevos). Nunca loguear tokens.
 *
 * @param paymentId ID del pago de MercadoPago.
 * @return Estado del pago o null cuando no se pudo consultar.
 */
async function resolverPaymentStatus(paymentId: string): Promise<{
  readonly status: string;
  readonly externalReference: string | null;
} | null>
{
  const turnoPorPago = await bookingService.getBookingByPaymentId(paymentId).catch(() => null);
  const negocioId = (turnoPorPago as { negocio_id?: unknown } | null)?.negocio_id;

  if (typeof negocioId === "string")
  {
    const businessToken = await paymentService.getBusinessAccessToken(negocioId);

    if (businessToken !== null)
    {
      const estado = await paymentService.getPaymentStatus(paymentId, businessToken).catch(() => null);

      if (estado !== null)
      {
        return estado;
      }
    }
  }

  const directo = await paymentService.getPaymentStatus(paymentId).catch(() => null);

  if (directo !== null)
  {
    return directo;
  }

  const conectados = await paymentService.listConnectedBusinessTokens().catch(() => []);

  for (const token of conectados)
  {
    const estado = await paymentService.getPaymentStatus(paymentId, token).catch(() => null);

    if (estado !== null)
    {
      return estado;
    }
  }

  return null;
}

/**
 * Aplica el resultado del pago al turno correspondiente.
 *
 * @param paymentStatus Estado consultado en MercadoPago.
 * @param paymentId ID del pago para confirmar la reserva.
 * @return Respuesta JSON con el resultado.
 */
async function aplicarResultadoPago(
  paymentStatus: { readonly status: string; readonly externalReference: string | null },
  paymentId: string,
): Promise<ReturnType<typeof NextResponse.json>>
{
  const bookingId = paymentStatus.externalReference;

  if (bookingId === null || bookingId.length === 0)
  {
    return NextResponse.json({ success: true, status: paymentStatus.status, sinReserva: true });
  }

  const existente = await bookingService.getBookingById(bookingId);
  const estadoActual = (existente as { estado?: unknown } | null)?.estado;

  // MercadoPago también emite el tópico `payment` para los cobros de la
  // suscripción SaaS, cuyo `external_reference` es el UUID del negocio (no un
  // turno). Sin reserva existente no hay nada que confirmar: se ignora en vez
  // de intentar confirmar una reserva inexistente.
  if (existente === null)
  {
    return NextResponse.json({ success: true, status: paymentStatus.status, sinReserva: true });
  }

  if (existente !== null && estadoActual === "pagado" && paymentStatus.status === "approved")
  {
    return NextResponse.json({ success: true, status: paymentStatus.status, idempotente: true });
  }

  // Anti-carrera con cancelaciones: un webhook aprobado tardío o reintentado
  // nunca resucita un turno final (ej. cancelado con seña ya devuelta).
  // Sin este guarda, el turno volvería a `pagado` y alimentaría ingresos fantasma.
  if (estadoActual === "cancelado" || estadoActual === "completado" || estadoActual === "ausente")
  {
    return NextResponse.json({ success: true, status: paymentStatus.status, turnoCerrado: true });
  }

  if (paymentStatus.status === "approved")
  {
    await bookingService.confirmBooking(bookingId, paymentId);

    const { crearEventoGoogleParaTurno } = await import("@/lib/services/calendar-sync");

    await crearEventoGoogleParaTurno(bookingId);
  }
  else if (paymentStatus.status === "rejected" || paymentStatus.status === "cancelled")
  {
    await bookingService.releaseBooking(bookingId);
    await borrarEventoGoogle(bookingId);
  }

  return NextResponse.json({ success: true, status: paymentStatus.status });
}

/**
 * Aplica un alta/baja del plan SaaS al negocio (`external_reference`).
 *
 * @param preapprovalId ID del preapproval de MercadoPago.
 * @return Respuesta JSON con el resultado.
 */
async function aplicarAltaSuscripcion(
  preapprovalId: string,
): Promise<ReturnType<typeof NextResponse.json>>
{
  let estado: { status: string; externalReference: string | null };

  try
  {
    estado = await subscriptionService.consultarEstado(preapprovalId);
  }
  catch (error)
  {
    // 404 = preapproval que el token actual no puede leer (huérfano de otra
    // cuenta/usuario de prueba). Se ignora con 200 para cortar los reintentos.
    if (error instanceof MpHttpError && error.status === 404)
    {
      console.warn(`[webhooks/suscripcion] preapproval ${preapprovalId} no encontrado (404); se ignora.`);

      return NextResponse.json({ success: true, ignorado: true, motivo: "preapproval_no_encontrado" });
    }

    console.error(
      `[webhooks/suscripcion] no se pudo consultar el preapproval ${preapprovalId}:`,
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json({ error: "No pudimos consultar la suscripción." }, { status: 502 });
  }

  if (estado.externalReference === null || estado.externalReference.length === 0)
  {
    console.warn(`[webhooks/suscripcion] preapproval ${preapprovalId} sin external_reference; se ignora.`);

    return NextResponse.json({ success: true, status: estado.status, sinNegocio: true });
  }

  if (estado.status === "authorized")
  {
    await subscriptionService.activarSuscripcion(estado.externalReference, preapprovalId);

    return NextResponse.json({ success: true, status: estado.status });
  }

  if (estado.status === "cancelled")
  {
    await subscriptionService.cancelarSuscripcionLocal(estado.externalReference);

    return NextResponse.json({ success: true, status: estado.status });
  }

  console.info(
    `[webhooks/suscripcion] preapproval ${preapprovalId} en estado ${estado.status}; sin cambios.`,
  );

  return NextResponse.json({ success: true, status: estado.status });
}

/**
 * Aplica un cobro mensual del plan SaaS (mora si fue rechazado).
 *
 * @param paymentId ID del cobro de MercadoPago.
 * @return Respuesta JSON con el resultado.
 */
async function aplicarCobroSuscripcion(
  paymentId: string,
): Promise<ReturnType<typeof NextResponse.json>>
{
  const vinculo = await subscriptionService.resolverNegocioDeCobro(paymentId);

  if (vinculo === null)
  {
    console.error(`[webhooks/suscripcion] no se pudo vincular el cobro ${paymentId}.`);

    return NextResponse.json({ error: "No pudimos vincular el cobro." }, { status: 502 });
  }

  // Historial de pagos: se persiste la cuota completa cuando MP expone monto,
  // moneda y fecha. Idempotente por `authorized_payment_id`; si falla, se
  // propaga para que MP reintente (el upsert no duplica).
  if (vinculo.montoCents !== null && vinculo.currency !== null && vinculo.fecha !== null)
  {
    await subscriptionService.registrarPago({
      negocioId: vinculo.negocioId,
      preapprovalId: vinculo.preapprovalId,
      authorizedPaymentId: vinculo.authorizedPaymentId,
      mpPaymentId: vinculo.mpPaymentId,
      montoCents: vinculo.montoCents,
      currency: vinculo.currency,
      estado: vinculo.status,
      fecha: vinculo.fecha,
    });
  }

  if (vinculo.status === "approved")
  {
    await subscriptionService.activarSuscripcion(vinculo.negocioId, vinculo.preapprovalId);

    return NextResponse.json({ success: true, status: vinculo.status });
  }

  if (vinculo.status === "rejected" || vinculo.status === "cancelled")
  {
    await subscriptionService.marcarPastDue(vinculo.negocioId);

    return NextResponse.json({ success: true, status: vinculo.status, mora: true });
  }

  return NextResponse.json({ success: true, status: vinculo.status });
}

export async function POST(request: Request)
{
  const secretoMp = readEnv("MP_WEBHOOK_SECRET");

  if (secretoMp === null && exigeFirmas())
  {
    return NextResponse.json({ error: "Webhook no configurado en producción." }, { status: 503 });
  }

  try
  {
    const body = await request.json();

    if (!esNotificacionPago(body) && !esAltaSuscripcion(body) && !esCobroSuscripcion(body))
    {
      // Tópicos que no manejamos (vinculación de apps, planes, reclamos…):
      // se aceptan para que MP no los marque como fallidos ni reintente.
      console.info("[webhooks] tópico no soportado; se ignora.");

      return NextResponse.json({ success: true, ignorado: true });
    }

    const paymentId = extraerPagoId(body);

    if (paymentId === null)
    {
      return NextResponse.json({ error: "Falta el ID del pago." }, { status: 400 });
    }

    const { firma, requestId, ts } = extraerFirma(request);
    // Docs MP: `data.id` viaja en el query; el cuerpo es fallback.
    const pagoIdQuery = new URL(request.url).searchParams.get("data.id");
    const firmaOk = await verificarFirmaMp({
      firma,
      secreto: secretoMp,
      pagoId: pagoIdQuery ?? paymentId,
      requestId,
      timestamp: ts,
    });

    if (!firmaOk)
    {
      console.warn(
        `[webhooks] firma inválida (firma=${firma !== null}, request-id=${requestId !== null}, ts=${ts.length > 0}).`,
      );

      return NextResponse.json({ error: "Firma del webhook inválida." }, { status: 401 });
    }

    if (esAltaSuscripcion(body))
    {
      return aplicarAltaSuscripcion(paymentId);
    }

    if (esCobroSuscripcion(body))
    {
      return aplicarCobroSuscripcion(paymentId);
    }

    const paymentStatus = await resolverPaymentStatus(paymentId);

    if (paymentStatus === null)
    {
      return NextResponse.json({ error: "No pudimos consultar el pago." }, { status: 502 });
    }

    return aplicarResultadoPago(paymentStatus, paymentId);
  }
  catch (error)
  {
    console.error("[webhooks] no se pudo procesar:", error instanceof Error ? error.message : error);

    return NextResponse.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }
}

/** Borra el evento inyectado al reservar (best-effort, nunca lanza). */
async function borrarEventoGoogle(bookingId: string): Promise<void>
{
  try
  {
    const turno = await bookingService.getBookingById(bookingId) as {
      negocio_id?: unknown; google_calendar_event_id?: unknown;
    } | null;
    const negocioId = turno?.negocio_id;
    const eventId = turno?.google_calendar_event_id;

    if (typeof negocioId !== "string" || typeof eventId !== "string" || eventId.length === 0)
    {
      return;
    }

    const { calendarService } = await import("@/lib/services/calendar");

    await calendarService.deleteEventForNegocio(negocioId, eventId);
  }
  catch
  {
    // Best-effort: el turno ya se liberó aunque falle Google.
  }
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
