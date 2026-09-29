/**
 * Recolector de reseñas (Módulo 5): cron llamado por QStash.
 *
 * Barrido idempotente: turnos `completado` con fin hace más de 2h,
 * `resena_pedida = false` y cliente con email. Envía el pedido con link
 * a `/resena/[turnoId]` y marca el flag para no repetir.
 *
 * Programar en QStash Schedules cada hora:
 * `POST https://<app>/api/cron/resenas`
 */

import { NextResponse } from "next/server";

import { shouldAskReview } from "@/lib/automations/resenas";
import { readEnv } from "@/lib/env/env";
import { plantillaResena } from "@/lib/notifications/templates";
import { ResendAdapter } from "@/lib/ports/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;

interface TurnoCandidato
{
  readonly id: string;
  readonly inicio: string;
  readonly fin: string | null;
  readonly resena_pedida: boolean;
  readonly negocio: { nombre: string } | null;
  readonly servicio: { nombre: string } | null;
  readonly staff: { nombre: string } | null;
  readonly cliente: { email: string | null } | null;
}

/** Base pública para construir el link de calificación. */
export function resolverBaseResena(): string | null
{
  const publica = readEnv("NEXT_PUBLIC_APP_URL");

  if (publica !== null)
  {
    return publica.replace(/\/+$/, "");
  }

  const vercel = readEnv("VERCEL_URL");

  return vercel !== null ? `https://${vercel.replace(/\/+$/, "")}` : null;
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

  const base = resolverBaseResena();

  if (base === null)
  {
    return NextResponse.json({ error: "Cron sin URL pública configurada." }, { status: 503 });
  }

  const ahora = new Date();
  const { data } = await admin.from("turnos")
    .select("id, inicio, fin, resena_pedida, negocio:negocios(nombre)," +
      " servicio:servicios(nombre), staff:staff(nombre), cliente:clientes(email)")
    .eq("estado", "completado").eq("resena_pedida", false)
    .limit(LIMITE_BARRIDO);

  const candidatos = ((data ?? []) as unknown as TurnoCandidato[])
    .filter((t) => shouldAskReview({
      fin: new Date(t.fin ?? t.inicio),
      resenaPedida: t.resena_pedida,
    }, ahora))
    .filter((t) => typeof t.cliente?.email === "string" && t.cliente.email.length > 0);

  const email = new ResendAdapter();
  let enviados = 0;

  for (const turno of candidatos)
  {
    try
    {
      const plantilla = plantillaResena({
        negocio: turno.negocio?.nombre ?? "tu negocio",
        servicio: turno.servicio?.nombre ?? "tu servicio",
        profesional: turno.staff?.nombre ?? "tu profesional",
        fecha: "",
        resenaUrl: `${base}/resena/${turno.id}`,
      });

      await email.send({
        to: turno.cliente?.email as string,
        subject: plantilla.subject,
        fromName: turno.negocio?.nombre,
        html: plantilla.html,
      });
      await admin.from("turnos").update({ resena_pedida: true }).eq("id", turno.id);
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
