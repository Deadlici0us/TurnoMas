/**
 * Recordatorios 24h antes (Módulo 5): cron llamado por QStash.
 *
 * Barrido global idempotente: turnos `pagado` o `confirmado` con inicio
 * en las próximas 24h y `notificacion_enviada = false` cuyo cliente
 * tenga email. `confirmado` = sin seña ($0 cobrado) también avisa;
 * `pendiente` espera pago y lo libera el antifantasma.
 * Envía por Resend y marca el flag para no repetir.
 *
 * Programar en QStash Schedules cada hora:
 * `POST https://<app>/api/cron/recordatorios`
 */

import { NextResponse } from "next/server";

import { shouldSendReminder } from "@/lib/automations/recordatorios";
import { readEnv } from "@/lib/env/env";
import { plantillaRecordatorio } from "@/lib/notifications/templates";
import { ResendAdapter } from "@/lib/ports/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;

interface TurnoCandidato
{
  readonly id: string;
  readonly inicio: string;
  readonly notificacion_enviada: boolean;
  readonly negocio: { nombre: string; timezone?: unknown; pais?: unknown } | null;
  readonly servicio: { nombre: string } | null;
  readonly staff: { nombre: string } | null;
  readonly cliente: { email: string | null } | null;
}

function formatearFechaEnZona(fecha: Date, timeZone: string): string
{
  const etiqueta = formatearEnZona(fecha, timeZone);
  const [diaMes, hora] = etiqueta.split(" ");
  const [dia, mes] = (diaMes ?? "").split("/");

  return `${dia}/${mes}/${fecha.getFullYear()} ${hora ?? ""}`.trim();
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

  const ahora = new Date();
  const ventana = new Date(ahora.getTime() + 24 * 3_600_000).toISOString();
  const { data } = await admin.from("turnos")
    .select("id, inicio, notificacion_enviada, negocio:negocios(nombre, timezone, pais)," +
      " servicio:servicios(nombre), staff:staff(nombre), cliente:clientes(email)")
    .in("estado", ["pagado", "confirmado"]).eq("notificacion_enviada", false)
    .gte("inicio", ahora.toISOString()).lte("inicio", ventana)
    .limit(LIMITE_BARRIDO);

  const candidatos = ((data ?? []) as unknown as TurnoCandidato[])
    .filter((t) => shouldSendReminder(
      { inicio: new Date(t.inicio), notificacionEnviada: t.notificacion_enviada }, ahora))
    .filter((t) => typeof t.cliente?.email === "string" && t.cliente.email.length > 0);

  const email = new ResendAdapter();
  let enviados = 0;

  for (const turno of candidatos)
  {
    try
    {
      const timeZone = resolverTimezoneNegocio({ timezone: turno.negocio?.timezone, pais: turno.negocio?.pais });
      const plantilla = plantillaRecordatorio({
        negocio: turno.negocio?.nombre ?? "tu negocio",
        servicio: turno.servicio?.nombre ?? "tu servicio",
        profesional: turno.staff?.nombre ?? "tu profesional",
        fecha: formatearFechaEnZona(new Date(turno.inicio), timeZone),
      });

      await email.send({
        to: turno.cliente?.email as string,
        subject: plantilla.subject,
        fromName: turno.negocio?.nombre,
        html: plantilla.html,
      });
      await admin.from("turnos").update({ notificacion_enviada: true }).eq("id", turno.id);
      enviados += 1;
    }
    catch
    {
      // Best-effort por turno: se reintenta en el próximo barrido.
    }
  }

  return NextResponse.json({ success: true, enviados });
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
