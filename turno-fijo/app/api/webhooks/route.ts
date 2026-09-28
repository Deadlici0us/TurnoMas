import { NextResponse } from "next/server";

import { paymentService } from "@/lib/services/payment";
import { bookingService } from "@/lib/services/booking";

export async function POST(request: Request)
{
  try
  {
    const body = await request.json();

    if (body.type !== "payment")
    {
      return NextResponse.json({ error: "Tipo de webhook inválido." }, { status: 400 });
    }

    const paymentId = body.data?.id;
    if (!paymentId)
    {
      return NextResponse.json({ error: "Falta el ID del pago." }, { status: 400 });
    }

    // Consulta el estado del pago en MercadoPago.
    const paymentStatus = await paymentService.getPaymentStatus(paymentId);

    if (paymentStatus.status === "approved")
    {
      // Actualiza la reserva a "pagado".
      // El ID de reserva viaja en external_reference del pago.
      const bookingId = body.data?.external_reference;
      if (bookingId)
      {
        await bookingService.confirmBooking(bookingId, paymentId);
      }
    }
    else if (paymentStatus.status === "rejected" || paymentStatus.status === "cancelled")
    {
      // Libera la reserva.
      const bookingId = body.data?.external_reference;
      if (bookingId)
      {
        await bookingService.releaseBooking(bookingId);
      }
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