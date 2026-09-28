import { NextResponse } from "next/server";

import { notificationService, NotificationType } from "@/lib/services/notifications";

/** Automatizaciones QStash: recordatorios 24h/1h, abandono y recupero. */
export async function POST(request: Request)
{
  try
  {
    const body = (await request.json()) as { type?: string; bookingId?: string; data?: Record<string, unknown> };

    if (body.type !== "reminder")
    {
      return NextResponse.json({ error: "Tipo de automatización inválido." }, { status: 400 });
    }

    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const data = body.data ?? {};
    const reminderKind = typeof data.kind === "string" ? data.kind : "reminder_24h";

    if (bookingId.length === 0)
    {
      return NextResponse.json({ error: "Falta el ID de la reserva." }, { status: 400 });
    }

    if (reminderKind === "abandonment")
    {
      await notificationService.sendAbandonmentEmail(bookingId, data);
    }
    else if (reminderKind === "recovery")
    {
      await notificationService.sendRecoveryEmail(bookingId, data);
    }
    else
    {
      await notificationService.scheduleReminder(
        bookingId,
        reminderKind === "reminder_1h" ? NotificationType.REMINDER_1H : NotificationType.REMINDER_24H,
        data,
      );
    }

    return NextResponse.json({ success: true });
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falló la automatización." },
      { status: 500 },
    );
  }
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
