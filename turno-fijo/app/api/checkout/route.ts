import { NextResponse } from "next/server";

import { resolveCheckout } from "@/lib/checkout/checkout";
import type { CheckoutInput } from "@/lib/checkout/checkout";
import { getDashboardData } from "@/lib/dashboard/queries";
import { paymentService } from "@/lib/services/payment";

export async function POST(request: Request)
{
  try
  {
    const body = (await request.json()) as Partial<CheckoutInput & {
      bookingId?: string;
      amountCents?: number;
      description?: string;
    }>;
    const input: CheckoutInput = {
      serviceRequiresDeposit: body.serviceRequiresDeposit ?? false,
      serviceDepositPercentage: body.serviceDepositPercentage ?? 50,
      blacklistDecision: body.blacklistDecision ?? "allowed",
    };

    const outcome = resolveCheckout(input);

    if (outcome.kind === "rejected")
    {
      return NextResponse.json({ success: false, outcome }, { status: 403 });
    }

    if (outcome.kind === "confirmed")
    {
      return NextResponse.json({ success: true, outcome, action: "confirm" }, { status: 200 });
    }

    const { data: dashboard } = await getDashboardData();

    if (dashboard.negocio === null)
    {
      return NextResponse.json({ error: "No hay negocio configurado." }, { status: 500 });
    }

    const preference = await paymentService.createDepositPreference(
      typeof body.bookingId === "string" ? body.bookingId : `reserva-${Date.now()}`,
      typeof body.amountCents === "number" ? body.amountCents : 0,
      outcome.percentage,
      typeof body.description === "string" ? body.description : "Seña de reserva TurnoFijo",
    );

    return NextResponse.json(
      { success: true, outcome, action: "create-preference", preference },
      { status: 200 },
    );
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 400 },
    );
  }
}
