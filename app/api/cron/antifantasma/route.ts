/**
 * Escudo anti-fantasmas (Módulo 5): cron llamado por QStash.
 *
 * Dos modos: por reserva (`{ turnoId }`, programado al crear la reserva
 * con seña con 15 min de retardo) o barrido global (sin turnoId, para
 * cron periódico). Solo cancela pendientes con seña vencidos.
 */

import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/with-api-handler";

import { shouldReleaseBooking } from "@/lib/automations/anti-ghost";
import { exigeFirmas, readEnv } from "@/lib/env/env";
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

/**
 * Cancela el turno solo si sigue pendiente (update condicional atómico).
 *
 * Anti-carrera con el webhook de pago: si la seña se acreditó entre el
 * SELECT y este UPDATE, el turno ya es `pagado` y no se toca (el cliente
 * pagó: cancelar sería cobrar sin dar el turno). Devuelve verdadero solo
 * cuando este llamado liberó la fila.
 *
 * @param admin Cliente admin de Supabase.
 * @param turnoId ID del turno a liberar.
 * @return Verdadero cuando el turno quedó cancelado por este llamado.
 */
async function cancelarSiPendiente(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turnoId: string,
): Promise<boolean>
{
  const { data, error } = await admin.from("turnos")
    .update({ estado: "cancelado" }).eq("id", turnoId).eq("estado", "pendiente")
    .select("id");

  if (error !== null)
  {
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Extrae el `turnoId` del cuerpo JSON, o null si no es válido.
 *
 * @param request Solicitud entrante del cron.
 * @return ID del turno, o null si el cuerpo no lo trae.
 */
async function leerTurnoId(request: Request): Promise<string | null>
{
  try
  {
    const body = (await request.json()) as { turnoId?: unknown };

    return typeof body.turnoId === "string" && body.turnoId.length > 0 ? body.turnoId : null;
  }
  catch
  {
    return null;
  }
}

/**
 * Libera un turno pendiente puntual si venció su período de gracia.
 *
 * @param admin Cliente admin de Supabase.
 * @param turnoId ID del turno a evaluar.
 * @param ahora Momento de referencia para el cálculo de gracia.
 * @return Respuesta JSON con el resultado de la liberación.
 */
async function liberarTurno(
  admin: ReturnType<typeof getSupabaseAdmin>,
  turnoId: string,
  ahora: Date,
): Promise<NextResponse>
{
  const { data: turno } = await admin.from("turnos")
    .select("id, created_at, estado, sena_monto")
    .eq("id", turnoId).single();

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

  if (!await cancelarSiPendiente(admin, turnoId))
  {
    return NextResponse.json({ success: true, liberado: false, motivo: "ya-procesado" });
  }

  return NextResponse.json({ success: true, liberado: true });
}

async function handlePOST(request: Request)
{
  const claveActual = readEnv("QSTASH_CURRENT_SIGNING_KEY");
  const claveSiguiente = readEnv("QSTASH_NEXT_SIGNING_KEY");

  if (claveActual === null && claveSiguiente === null && exigeFirmas())
  {
    return NextResponse.json({ error: "Cron no configurado en producción." }, { status: 503 });
  }

  const firmaOk = await verificarFirmaQStash({
    firma: request.headers.get("upstash-signature"),
    claveActual,
    claveSiguiente,
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

  const turnoId = await leerTurnoId(request);
  const ahora = new Date();

  if (turnoId !== null)
  {
    return liberarTurno(admin, turnoId, ahora);
  }

  const corte = new Date(ahora.getTime() - GRACIA_MINUTOS * 60_000).toISOString();
  const { data } = await admin.from("turnos")
    .select("id, created_at, estado, sena_monto")
    .eq("estado", "pendiente").not("sena_monto", "is", null).lt("created_at", corte)
    .limit(LIMITE_BARRIDO);
  const vencidos = ((data ?? []) as unknown as TurnoPendiente[])
    .filter((t) => shouldReleaseBooking({ createdAt: new Date(t.created_at), paymentRegistered: false },
      ahora, GRACIA_MINUTOS));
  let liberados = 0;

  for (const turno of vencidos)
  {
    if (await cancelarSiPendiente(admin, turno.id))
    {
      liberados += 1;
    }
  }

  return NextResponse.json({ success: true, liberados });
}

async function handleGET()
{
  return NextResponse.json({ status: "ok" });
}

export const GET = withApiHandler("/app/api/cron/antifantasma", handleGET);
export const POST = withApiHandler("/app/api/cron/antifantasma", handlePOST);
