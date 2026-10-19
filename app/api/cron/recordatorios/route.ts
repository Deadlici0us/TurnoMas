/**
 * Recordatorios 24h antes (Módulo 5): cron llamado por QStash.
 *
 * Barrido global idempotente: turnos `pagado` o `confirmado` con inicio
 * en las próximas 24h y `notificacion_enviada = false` cuyo cliente
 * tenga email. `confirmado` = sin seña ($0 cobrado) también avisa;
 * `pendiente` espera pago y lo libera el antifantasma.
 * Incluye el link mágico de cancelación (CANCELACION_SECRET) para que el
 * cliente libere el lugar sin escribir.
 * Envía por Resend y marca el flag para no repetir.
 *
 * Programar en QStash Schedules cada hora:
 * `POST https://<app>/api/cron/recordatorios`
 */

import { NextResponse } from "next/server";

import { resolverRecordatorioHs, shouldSendReminder } from "@/lib/automations/recordatorios";
import { exigeFirmas, readEnv } from "@/lib/env/env";
import { resolverPlantilla } from "@/lib/notifications/custom-templates";
import { ResendAdapter } from "@/lib/ports/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;

interface TurnoCandidato
{
  readonly id: string;
  readonly cliente_id: string;
  readonly inicio: string;
  readonly notificacion_enviada: boolean;
  readonly negocio: {
    nombre: string; timezone?: unknown; pais?: unknown;
    recordatorio_activo?: boolean | null; recordatorio_hs?: number | null;
    msg_recordatorio_subject?: string | null; msg_recordatorio_cuerpo?: string | null;
  } | null;
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

/**
 * Compone y envía el recordatorio por email de un único turno.
 *
 * @param turno Turno candidato con sus relaciones resueltas.
 * @param email Adaptador de envío por Resend.
 * @param base URL pública de la app, o null si no está configurada.
 * @param secreto Secreto de cancelación, o null si no está configurado.
 */
async function enviarRecordatorio(
  turno: TurnoCandidato,
  email: ResendAdapter,
  base: string | null,
  secreto: string | null,
): Promise<void>
{
  const timeZone = resolverTimezoneNegocio({ timezone: turno.negocio?.timezone, pais: turno.negocio?.pais });
  const datos = {
    negocio: turno.negocio?.nombre ?? "tu negocio",
    servicio: turno.servicio?.nombre ?? "tu servicio",
    profesional: turno.staff?.nombre ?? "tu profesional",
    fecha: formatearFechaEnZona(new Date(turno.inicio), timeZone),
  };

  let cancelacionUrl = "";

  if (base !== null && secreto !== null && secreto.trim().length >= 16)
  {
    const { construirLinkCancelacion, firmarTokenCancelacion } = await import("@/lib/cancelacion/token");
    const token = firmarTokenCancelacion({
      turnoId: turno.id,
      clienteId: turno.cliente_id,
      inicio: new Date(turno.inicio),
    }, secreto);

    cancelacionUrl = construirLinkCancelacion(stripTrailingSlashes(base), turno.id, token);
  }

  const cancelaLinea = cancelacionUrl.length > 0 ? "\nSi no podés venir, cancelá acá: {link}" : "";
  const cuerpoCustom = typeof turno.negocio?.msg_recordatorio_cuerpo === "string"
    && turno.negocio.msg_recordatorio_cuerpo.trim().length > 0
    ? `${turno.negocio.msg_recordatorio_cuerpo}${cancelaLinea}`
    : null;
  const plantilla = resolverPlantilla("recordatorio", {
    subject: turno.negocio?.msg_recordatorio_subject ?? null,
    cuerpo: cuerpoCustom,
  }, datos, cancelacionUrl);

  await email.send({
    to: turno.cliente?.email as string,
    subject: plantilla.subject,
    fromName: turno.negocio?.nombre,
    html: plantilla.html,
  });
}

export async function POST(request: Request)
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

  const ahora = new Date();
  const ventanaMax = new Date(ahora.getTime() + 72 * 3_600_000).toISOString();
  const { data } = await admin.from("turnos")
    .select("id, cliente_id, inicio, notificacion_enviada," +
      " negocio:negocios(nombre, timezone, pais, recordatorio_activo, recordatorio_hs," +
      " msg_recordatorio_subject, msg_recordatorio_cuerpo)," +
      " servicio:servicios(nombre), staff:staff(nombre), cliente:clientes(email)")
    .in("estado", ["pagado", "confirmado"]).eq("notificacion_enviada", false)
    .gte("inicio", ahora.toISOString()).lte("inicio", ventanaMax)
    .limit(LIMITE_BARRIDO);

  const candidatos = ((data ?? []) as unknown as TurnoCandidato[])
    .filter((t) => t.negocio?.recordatorio_activo !== false)
    .filter((t) => shouldSendReminder(
      { inicio: new Date(t.inicio), notificacionEnviada: t.notificacion_enviada },
      ahora, resolverRecordatorioHs(t.negocio?.recordatorio_hs)))
    .filter((t) => typeof t.cliente?.email === "string" && t.cliente.email.length > 0);

  const email = new ResendAdapter();
  let enviados = 0;

  const base = readEnv("NEXT_PUBLIC_APP_URL") ?? (readEnv("VERCEL_URL") !== null
    ? `https://${readEnv("VERCEL_URL") as string}` : null);
  const secreto = readEnv("CANCELACION_SECRET");

  for (const turno of candidatos)
  {
    try
    {
      await enviarRecordatorio(turno, email, base, secreto);
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
