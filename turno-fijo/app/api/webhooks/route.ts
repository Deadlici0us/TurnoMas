import { NextResponse } from "next/server";

import { paymentService } from "@/lib/services/payment";
import { bookingService } from "@/lib/services/booking";
import { readEnv } from "@/lib/env/env";
import { esNotificacionPago, extraerPagoId, verificarFirmaMp } from "@/lib/webhooks/mercadopago";

function extraerFirma(request: Request): { firma: string | null; ts: string }
{
  const firma = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const params = firma !== null ? firma.split(",").map((p) => p.trim()) : [];
  const ts = params.find((p) => p.startsWith("ts="))?.slice("ts=".length) ?? requestId ?? "";

  return { firma, ts };
}

export async function POST(request: Request)
{
  try
  {
    const body = await request.json();

    if (!esNotificacionPago(body))
    {
      return NextResponse.json({ error: "Tipo de webhook inválido." }, { status: 400 });
    }

    const paymentId = extraerPagoId(body);

    if (paymentId === null)
    {
      return NextResponse.json({ error: "Falta el ID del pago." }, { status: 400 });
    }

    const { firma, ts } = extraerFirma(request);
    const firmaOk = await verificarFirmaMp({
      firma,
      secreto: readEnv("MP_WEBHOOK_SECRET"),
      pagoId: paymentId,
      timestamp: ts,
    });

    if (!firmaOk)
    {
      return NextResponse.json({ error: "Firma del webhook inválida." }, { status: 401 });
    }

    // El ID de reserva viaja en external_reference del pago (fuente real),
    // no en el body del webhook que varía según tópico de MP.
    // Con señas delegadas el pago vive en la cuenta del negocio: si la
    // plataforma no lo ve, se reintenta con el token del negocio dueño
    // del turno que ya registró ese `mp_payment_id`.
    let paymentStatus = await paymentService.getPaymentStatus(paymentId).catch(() => null);

    if (paymentStatus === null)
    {
      const turnoPorPago = await bookingService.getBookingByPaymentId(paymentId).catch(() => null);
      const negocioId = (turnoPorPago as { negocio_id?: unknown } | null)?.negocio_id;

      if (typeof negocioId !== "string")
      {
        return NextResponse.json({ error: "No pudimos consultar el pago." }, { status: 502 });
      }

      const businessToken = await paymentService.getBusinessAccessToken(negocioId);
      paymentStatus = await paymentService.getPaymentStatus(paymentId, businessToken).catch(() => null);

      if (paymentStatus === null)
      {
        return NextResponse.json({ error: "No pudimos consultar el pago." }, { status: 502 });
      }
    }

    const bookingId = paymentStatus.externalReference;

    if (bookingId === null || bookingId.length === 0)
    {
      return NextResponse.json({ success: true, status: paymentStatus.status, sinReserva: true });
    }

    const existente = await bookingService.getBookingById(bookingId);

    if (existente !== null && (existente as { estado?: string }).estado === "pagado"
      && paymentStatus.status === "approved")
    {
      return NextResponse.json({ success: true, status: paymentStatus.status, idempotente: true });
    }

    if (paymentStatus.status === "approved")
    {
      await bookingService.confirmBooking(bookingId, paymentId);
    }
    else if (paymentStatus.status === "rejected" || paymentStatus.status === "cancelled")
    {
      await bookingService.releaseBooking(bookingId);
    }

    return NextResponse.json({ success: true, status: paymentStatus.status });
  }
  catch
  {
    return NextResponse.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
