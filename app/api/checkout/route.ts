import { NextResponse } from "next/server";

import { resolveCheckout } from "@/lib/checkout/checkout";
import type { CheckoutInput } from "@/lib/checkout/checkout";
import { paymentService } from "@/lib/services/payment";

const DEFAULT_DESCRIPTION = "Seña de reserva TurnoMas";

/** Valida que la reserva tenga identidad trazable para el webhook. */
function exigirBookingId(raw: unknown): string
{
  if (typeof raw !== "string" || raw.trim().length === 0)
  {
    throw new RangeError("La reserva requiere un identificador válido.");
  }

  return raw.trim();
}

/** Valida el monto total en centavos antes de crear la preferencia. */
function exigirMonto(raw: unknown): number
{
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0)
  {
    throw new RangeError("El monto debe ser un entero positivo en centavos.");
  }

  return raw;
}

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

    const bookingId = exigirBookingId(body.bookingId);
    const amountCents = exigirMonto(body.amountCents);
    const description = typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim().slice(0, 120)
      : DEFAULT_DESCRIPTION;

    const preference = await paymentService.createDepositPreference(
      bookingId,
      amountCents,
      outcome.percentage,
      description,
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
