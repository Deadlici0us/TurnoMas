/**
 * Estado actual de la suscripción del negocio (lectura local, sin llamar a MP).
 *
 * Lo consulta el paywall para levantarse solo cuando el webhook (o la
 * reconciliación) dejó el plan activo, sin obligar a recargar a mano.
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET()
{
  try
  {
    await assertModoEditable();
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "La demo es de solo lectura." },
      { status: 403 },
    );
  }

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

    try
    {
      assertDuenoEditable({ userId: user.id, email: user.email ?? null });
    }
    catch (error)
    {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "La demo es de solo lectura." },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: negocio } = await admin.from("negocios")
      .select("created_at, suscripcion_estado, suscripcion_mp_id, suscripcion_mora_desde, suscripcion_vence_en, suscripcion_cancelada_en")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de consultar el plan." },
        { status: 400 },
      );
    }

    const fila = negocio as {
      created_at?: unknown;
      suscripcion_estado?: unknown;
      suscripcion_mp_id?: unknown;
      suscripcion_mora_desde?: unknown;
      suscripcion_vence_en?: unknown;
      suscripcion_cancelada_en?: unknown;
    };
    const estado = getNegocioSubscriptionStatus({
      created_at: typeof fila.created_at === "string" ? fila.created_at : null,
      suscripcion_estado:
        typeof fila.suscripcion_estado === "string" ? fila.suscripcion_estado : null,
      suscripcion_mp_id:
        typeof fila.suscripcion_mp_id === "string" ? fila.suscripcion_mp_id : null,
      suscripcion_mora_desde:
        typeof fila.suscripcion_mora_desde === "string" ? fila.suscripcion_mora_desde : null,
      suscripcion_vence_en:
        typeof fila.suscripcion_vence_en === "string" ? fila.suscripcion_vence_en : null,
      suscripcion_cancelada_en:
        typeof fila.suscripcion_cancelada_en === "string" ? fila.suscripcion_cancelada_en : null,
    });

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
