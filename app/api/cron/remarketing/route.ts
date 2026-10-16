/**
 * Boomerang de remarketing (Módulo 5): cron llamado por QStash.
 *
 * Barrido idempotente por cliente: se considera la última visita completada
 * y los días del servicio de esa visita. Se envía solo si no fue enviado,
 * sin marca manual de WhatsApp, servicio/negocio con remarketing activo,
 * cliente con email, no bloqueado, sin turno futuro y siendo la última visita.
 *
 * Programar en QStash Schedules una vez por día:
 * `POST https://<app>/api/cron/remarketing`
 */

import { NextResponse } from "next/server";

import { resolverRemarketingDias, shouldSendRemarketing } from "@/lib/automations/remarketing";
import { filtrarCandidatosVigentes, type TurnoVecino } from "@/lib/remarketing/candidatos";
import { exigeFirmas, readEnv } from "@/lib/env/env";
import { resolverPlantilla } from "@/lib/notifications/custom-templates";
import { ResendAdapter } from "@/lib/ports/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;
const DIAS_ESPERA_DEFAULT = 30;

interface TurnoCandidato
{
  readonly id: string;
  readonly cliente_id: string;
  readonly inicio: string;
  readonly fin: string | null;
  readonly remarketing_enviado: boolean;
  readonly remarketing_manual_at: string | null;
  readonly negocio: {
    nombre: string; pais: string; slug: string;
    remarketing_activo?: boolean | null; remarketing_dias?: number | null;
    msg_remarketing_subject?: string | null; msg_remarketing_cuerpo?: string | null;
  } | null;
  readonly servicio: {
    nombre: string; remarketing: boolean; remarketing_dias?: number | null;
  } | null;
  readonly staff: { nombre: string } | null;
  readonly cliente: { email: string | null; bloqueado?: boolean | null } | null;
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
    .select("id, cliente_id, inicio, fin, remarketing_enviado, remarketing_manual_at," +
      " negocio:negocios(nombre, pais, slug, remarketing_activo, remarketing_dias," +
      " msg_remarketing_subject, msg_remarketing_cuerpo)," +
      " servicio:servicios(nombre, remarketing, remarketing_dias)," +
      " staff:staff(nombre), cliente:clientes(email, bloqueado)")
    .eq("estado", "completado").eq("remarketing_enviado", false)
    .limit(LIMITE_BARRIDO);

  const preCandidatos = ((data ?? []) as unknown as TurnoCandidato[])
    .filter((t) => t.negocio?.remarketing_activo !== false)
    .filter((t) => t.servicio?.remarketing !== false)
    .filter((t) => t.remarketing_manual_at === null)
    .filter((t) => t.cliente?.bloqueado !== true)
    .filter((t) => shouldSendRemarketing({
      fin: new Date(t.fin ?? t.inicio),
      remarketingEnviado: t.remarketing_enviado,
    }, ahora, resolverRemarketingDias(
      t.servicio?.remarketing_dias, t.negocio?.remarketing_dias ?? diasEspera)))
    .filter((t) => typeof t.cliente?.email === "string" && t.cliente.email.length > 0);

  const candidatos = await filtrarPorReglaDeCliente(admin, preCandidatos, ahora);

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

/**
 * Aplica la regla por cliente: solo la última visita completada y sin turno
 * futuro. Consulta los turnos vecinos de los clientes candidatos.
 */
async function filtrarPorReglaDeCliente(
  admin: ReturnType<typeof getSupabaseAdmin>,
  preCandidatos: readonly TurnoCandidato[],
  ahora: Date,
): Promise<TurnoCandidato[]>
{
  const clienteIds = [...new Set(preCandidatos.map((t) => t.cliente_id))];

  if (clienteIds.length === 0)
  {
    return [];
  }

  const { data: vecinos } = await admin.from("turnos")
    .select("id, cliente_id, inicio, fin, estado")
    .in("cliente_id", clienteIds);

  const vigentes = new Set(filtrarCandidatosVigentes(
    preCandidatos.map((t) => ({ id: t.id, cliente_id: t.cliente_id })),
    (vecinos ?? []) as unknown as TurnoVecino[],
    ahora,
  ));

  return preCandidatos.filter((t) => vigentes.has(t.id));
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
