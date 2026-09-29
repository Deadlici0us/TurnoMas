/**
 * Escudo anti-fantasmas (Módulo 5): cron llamado por QStash.
 *
 * Dos modos: por reserva (`{ turnoId }`, programado al crear la reserva
 * con seña con 15 min de retardo) o barrido global (sin turnoId, para
 * cron periódico). Solo cancela pendientes con seña vencidos.
 */

import { NextResponse } from "next/server";

import { shouldReleaseBooking } from "@/lib/automations/anti-ghost";
import { readEnv } from "@/lib/env/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const GRACIA_MINUTOS = 15;
const LIMITE_BARRIDO = 100;

interface TurnoPendiente
{
  readonly id: string;
  readonly created_at: string;
  readonly estado: string;
  readonly sena_monto: number | null;
}

function esPendienteConSena(turno: TurnoPendiente): boolean
{
  return turno.estado === "pendiente" && turno.sena_monto !== null;
}

export async function POST(request: Request)
{
  const firmaOk = await verificarFirmaQStash({
    firma: request.headers.get("upstash-signature"),
    claveActual: readEnv("QSTASH_CURRENT_SIGNING_KEY"),
    claveSiguiente: readEnv("QSTASH_NEXT_SIGNING_KEY"),
  });

  if (!firmaOk)
  {
    return NextResponse.json({ error: "Firma de QStash inválida." }, { status: 401 });
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;

  try
  {
    admin = getSupabaseAdmin();
  }
  catch
  {
    return NextResponse.json({ error: "Cron no disponible sin base configurada." }, { status: 503 });
  }

  let turnoId: string | null = null;

  try
  {
    const body = (await request.json()) as { turnoId?: unknown };
    turnoId = typeof body.turnoId === "string" && body.turnoId.length > 0 ? body.turnoId : null;
  }
  catch
  {
    turnoId = null;
  }

  const ahora = new Date();

  if (turnoId !== null)
  {
    const { data: turno } = await admin.from("turnos")
      .select("id, created_at, estado, sena_monto").eq("id", turnoId).single();

    if (turno === null)
    {
      return NextResponse.json({ success: true, liberado: false, motivo: "sin-turno" });
    }

    const pendiente = turno as unknown as TurnoPendiente;

    if (!esPendienteConSena(pendiente))
    {
      return NextResponse.json({ success: true, liberado: false, motivo: "sin-deuda" });
    }

    const vencido = shouldReleaseBooking({
      createdAt: new Date(pendiente.created_at),
      paymentRegistered: false,
    }, ahora, GRACIA_MINUTOS);

    if (!vencido)
    {
      return NextResponse.json({ success: true, liberado: false, motivo: "en-gracia" });
    }

    await admin.from("turnos").update({ estado: "cancelado" }).eq("id", turnoId);

    return NextResponse.json({ success: true, liberado: true });
  }

  const corte = new Date(ahora.getTime() - GRACIA_MINUTOS * 60_000).toISOString();
  const { data } = await admin.from("turnos").select("id, created_at, estado, sena_monto")
    .eq("estado", "pendiente").not("sena_monto", "is", null).lt("created_at", corte)
    .limit(LIMITE_BARRIDO);
  const vencidos = ((data ?? []) as unknown as TurnoPendiente[])
    .filter((t) => shouldReleaseBooking({ createdAt: new Date(t.created_at), paymentRegistered: false },
      ahora, GRACIA_MINUTOS));

  for (const turno of vencidos)
  {
    await admin.from("turnos").update({ estado: "cancelado" }).eq("id", turno.id);
  }

  return NextResponse.json({ success: true, liberados: vencidos.length });
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
