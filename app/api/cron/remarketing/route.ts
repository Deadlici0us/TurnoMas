/**
 * Boomerang de remarketing (Módulo 5): cron llamado por QStash.
 *
 * Barrido idempotente: turnos `completado` con fin anterior a X días
 * (body `{ diasEspera }`, default 30), `remarketing_enviado = false`,
 * servicio con `remarketing` activo y cliente con email.
 *
 * Programar en QStash Schedules una vez por día:
 * `POST https://<app>/api/cron/remarketing`
 */

import { NextResponse } from "next/server";

import { shouldSendRemarketing } from "@/lib/automations/remarketing";
import { resolverRemarketingDias } from "@/lib/automations/remarketing";
import { readEnv } from "@/lib/env/env";
import { resolverPlantilla } from "@/lib/notifications/custom-templates";
import { ResendAdapter } from "@/lib/ports/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;
const DIAS_ESPERA_DEFAULT = 30;

interface TurnoCandidato
{
  readonly id: string;
  readonly inicio: string;
  readonly fin: string | null;
  readonly remarketing_enviado: boolean;
  readonly negocio: {
    nombre: string; pais: string; slug: string;
    remarketing_activo?: boolean | null; remarketing_dias?: number | null;
    msg_remarketing_subject?: string | null; msg_remarketing_cuerpo?: string | null;
  } | null;
  readonly servicio: {
    nombre: string; remarketing: boolean; remarketing_dias?: number | null;
  } | null;
  readonly staff: { nombre: string } | null;
  readonly cliente: { email: string | null } | null;
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

  let diasEspera = DIAS_ESPERA_DEFAULT;

  try
  {
    const body = (await request.json()) as { diasEspera?: unknown };

    if (typeof body.diasEspera === "number" && Number.isInteger(body.diasEspera)
      && body.diasEspera > 0)
    {
      diasEspera = body.diasEspera;
    }
  }
  catch
  {
    diasEspera = DIAS_ESPERA_DEFAULT;
  }

  const ahora = new Date();
  const { data } = await admin.from("turnos")
    .select("id, inicio, fin, remarketing_enviado," +
      " negocio:negocios(nombre, pais, slug, remarketing_activo, remarketing_dias," +
      " msg_remarketing_subject, msg_remarketing_cuerpo)," +
      " servicio:servicios(nombre, remarketing, remarketing_dias)," +
      " staff:staff(nombre), cliente:clientes(email)")
    .eq("estado", "completado").eq("remarketing_enviado", false)
    .limit(LIMITE_BARRIDO);

  const candidatos = ((data ?? []) as unknown as TurnoCandidato[])
    .filter((t) => t.negocio?.remarketing_activo !== false)
    .filter((t) => t.servicio?.remarketing !== false)
    .filter((t) => shouldSendRemarketing({
      fin: new Date(t.fin ?? t.inicio),
      remarketingEnviado: t.remarketing_enviado,
    }, ahora, resolverRemarketingDias(
      t.servicio?.remarketing_dias, t.negocio?.remarketing_dias ?? diasEspera)))
    .filter((t) => typeof t.cliente?.email === "string" && t.cliente.email.length > 0);

  const email = new ResendAdapter();
  let enviados = 0;

  for (const turno of candidatos)
  {
    try
    {
      const portalUrl = turno.negocio !== null
        ? `/${turno.negocio.pais}/${turno.negocio.slug}`
        : "/";
      const plantilla = resolverPlantilla("remarketing", {
        subject: turno.negocio?.msg_remarketing_subject ?? null,
        cuerpo: turno.negocio?.msg_remarketing_cuerpo ?? null,
      }, {
        negocio: turno.negocio?.nombre ?? "tu negocio",
        servicio: turno.servicio?.nombre ?? "tu servicio",
        profesional: turno.staff?.nombre ?? "tu profesional",
        fecha: "",
      }, portalUrl);

      await email.send({
        to: turno.cliente?.email as string,
        subject: plantilla.subject,
        fromName: turno.negocio?.nombre,
        html: plantilla.html,
      });
      await admin.from("turnos").update({ remarketing_enviado: true }).eq("id", turno.id);
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
