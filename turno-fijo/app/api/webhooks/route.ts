import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env/env";
import { paymentService } from "@/lib/services/payment";
import { bookingService } from "@/lib/services/booking";

export async function POST(request: Request)
{
  try
  {
    const body = await request.json();

    if (body.type !== "payment")
    {
      return NextResponse.json({ error: "Invalid webhook type" }, { status: 400 });
    }

    const paymentId = body.data?.id;
    if (!paymentId)
    {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    // Get payment status from MercadoPago
    const paymentStatus = await paymentService.getPaymentStatus(paymentId);

    if (paymentStatus.status === "approved")
    {
      // Update the booking status to "pagado"
      // The booking ID should be stored in the payment's external_reference
      const bookingId = body.data?.external_reference;
      if (bookingId)
      {
        await bookingService.confirmBooking(bookingId, paymentId);
      }
    }
    else if (paymentStatus.status === "rejected" || paymentStatus.status === "cancelled")
    {
      // Release the booking
      const bookingId = body.data?.external_reference;
      if (bookingId)
      {
        await bookingService.releaseBooking(bookingId);
      }
    }

    return NextResponse.json({ success: true, status: paymentStatus.status });
  }
  catch (error)
  {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({ status: "ok" });
}