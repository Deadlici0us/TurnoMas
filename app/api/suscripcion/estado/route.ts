/**
 * Estado actual de la suscripción del negocio (lectura local, sin llamar a MP).
 *
 * Lo consulta el paywall para levantarse solo cuando el webhook (o la
 * reconciliación) dejó el plan activo, sin obligar a recargar a mano.
 */

import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/with-api-handler";

import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

interface FilaNegocio
{
  readonly created_at?: unknown;
  readonly suscripcion_estado?: unknown;
  readonly suscripcion_mp_id?: unknown;
  readonly suscripcion_mora_desde?: unknown;
  readonly suscripcion_vence_en?: unknown;
  readonly suscripcion_cancelada_en?: unknown;
  readonly suscripcion_mp_status?: unknown;
}

/**
 * Normaliza un valor a string o null.
 *
 * @param valor Valor recibido desde la fila de Supabase.
 * @return El string, o null si no lo es.
 */
function textoONull(valor: unknown): string | null
{
  return typeof valor === "string" ? valor : null;
}

/**
 * Calcula el estado de suscripción a partir de la fila del negocio.
 *
 * @param fila Fila de `negocios` con las columnas de suscripción.
 * @return Estado de suscripción normalizado para el paywall.
 */
function estadoDeFila(fila: FilaNegocio): ReturnType<typeof getNegocioSubscriptionStatus>
{
  return getNegocioSubscriptionStatus({
    created_at: textoONull(fila.created_at),
    suscripcion_estado: textoONull(fila.suscripcion_estado),
    suscripcion_mp_id: textoONull(fila.suscripcion_mp_id),
    suscripcion_mora_desde: textoONull(fila.suscripcion_mora_desde),
    suscripcion_vence_en: textoONull(fila.suscripcion_vence_en),
    suscripcion_cancelada_en: textoONull(fila.suscripcion_cancelada_en),
    suscripcion_mp_status: textoONull(fila.suscripcion_mp_status),
  });
}

async function handleGET()
{
  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user === null)
    {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión para consultar tu plan." },
        { status: 401 },
      );
    }

    const admin = getSupabaseAdmin();
    // `select("*")` tolera entornos previos a la migración 0018.
    const { data: negocio } = await admin.from("negocios")
      .select("*")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de consultar el plan." },
        { status: 400 },
      );
    }

    const estado = estadoDeFila(negocio as FilaNegocio);

    return NextResponse.json(
      { success: true, estado, bloqueado: estado === "blocked" },
      { status: 200 },
    );
  }
  catch (error)
  {
    console.error("[suscripcion/estado]", error instanceof Error ? error.message : error);

    return NextResponse.json(
      { error: "No pudimos consultar el estado del plan. Probá de nuevo." },
      { status: 502 },
    );
  }
}

export const GET = withApiHandler("/app/api/suscripcion/estado", handleGET);
