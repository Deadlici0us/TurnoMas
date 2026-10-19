/**
 * Reconciliación de suscripciones SaaS (cron llamado por QStash).
 *
 * Red de seguridad del espejo local: revisa sólo las suscripciones en riesgo
 * (vencidas/near-vence, sin verificar hace rato, o en mora) y sincroniza el
 * estado real del preapproval en MercadoPago. Así, si el webhook de renovación
 * se pierde, el plan se reactualiza solo y el cliente no ve un falso bloqueo.
 *
 * Barrido acotado (índice `negocios_suscripcion_riesgo`): O(negocios en riesgo),
 * no O(total). Idempotente: `verificarPreapproval` sólo actualiza el espejo.
 *
 * Programar en QStash Schedules cada 6 horas:
 * `POST https://<app>/api/cron/suscripciones`
 */

import { NextResponse } from "next/server";

import { exigeFirmas, readEnv } from "@/lib/env/env";
import { promocionService } from "@/lib/services/promociones";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verificarFirmaQStash } from "@/lib/webhooks/qstash";

const LIMITE_BARRIDO = 100;

/** Ventana para reverificar una suscripción ya confirmada. */
const REVERIFICAR_HORAS = 12;

/** Anticipación con la que se empieza a reconciliar antes del vencimiento. */
const HORIZONTE_VENCIMIENTO_HORAS = 48;

interface NegocioRiesgo
{
  readonly id: string;
  readonly suscripcion_mp_id: string;
}

/**
 * Arma el criterio `or` de PostgREST para el subconjunto en riesgo.
 *
 * @param ahora Momento de referencia.
 * @return Expresión `or` lista para `.or(...)`.
 */
export function criterioRiesgo(ahora: Date): string
{
  const reverificarAntes = new Date(ahora.getTime() - REVERIFICAR_HORAS * 3_600_000).toISOString();
  const horizonte = new Date(ahora.getTime() + HORIZONTE_VENCIMIENTO_HORAS * 3_600_000).toISOString();

  return [
    "suscripcion_mp_status.is.null",
    "suscripcion_verificada_en.is.null",
    `suscripcion_verificada_en.lt.${reverificarAntes}`,
    `suscripcion_vence_en.lte.${horizonte}`,
    "suscripcion_estado.eq.past_due",
  ].join(",");
}

export async function POST(request: Request): Promise<ReturnType<typeof NextResponse.json>>
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
  const { data } = await admin.from("negocios")
    .select("id, suscripcion_mp_id, suscripcion_estado, suscripcion_vence_en, suscripcion_mp_status, suscripcion_verificada_en")
    .not("suscripcion_mp_id", "is", null)
    .or(criterioRiesgo(ahora))
    .order("suscripcion_vence_en", { ascending: true, nullsFirst: true })
    .limit(LIMITE_BARRIDO);

  const filas = (Array.isArray(data) ? data : []).flatMap((raw) =>
  {
    if (typeof raw !== "object" || raw === null)
    {
      return [];
    }

    const fila = raw as Record<string, unknown>;

    if (typeof fila.id !== "string" || typeof fila.suscripcion_mp_id !== "string"
      || fila.suscripcion_mp_id.length === 0)
    {
      return [];
    }

    return [{ id: fila.id, suscripcion_mp_id: fila.suscripcion_mp_id } as NegocioRiesgo];
  });

  let activadas = 0;
  let errores = 0;

  for (const negocio of filas)
  {
    try
    {
      const resultado = await subscriptionService.verificarPreapproval(
        negocio.id, negocio.suscripcion_mp_id, ahora);

      if (resultado.activo)
      {
        activadas += 1;
      }
    }
    catch
    {
      // Best-effort por negocio: se reintenta en el próximo barrido.
      errores += 1;
    }
  }

  // Promos: vence las que expiraron, restaura el precio base y reintenta las
  // que quedaron desincronizadas con MercadoPago. Aislado del barrido de
  // suscripciones para que un fallo de promociones no corte el rescate.
  let promociones: { revisadas: number; sincronizadas: number; errores: number } = {
    revisadas: 0,
    sincronizadas: 0,
    errores: 0,
  };

  try
  {
    promociones = await promocionService.sincronizarPendientes(ahora);
  }
  catch (error)
  {
    console.error(
      "[cron/suscripciones] promociones",
      error instanceof Error ? error.message : error,
    );
    promociones = { revisadas: 0, sincronizadas: 0, errores: 1 };
  }

  return NextResponse.json({
    success: true,
    revisadas: filas.length,
    activadas,
    errores,
    promociones,
  });
}

export async function GET(): Promise<ReturnType<typeof NextResponse.json>>
{
  return NextResponse.json({ status: "ok" });
}
