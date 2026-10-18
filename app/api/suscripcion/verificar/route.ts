/**
 * Reconcilia la suscripción del negocio contra MercadoPago.
 *
 * Se usa al volver del checkout (`?suscripcion=ok`) y con el botón
 * "Ya pagué, verificar ahora": si MP ya autorizó el preapproval pero el
 * webhook no llegó, activa el plan igual (y cancela duplicados). No depende
 * de firmas ni de la entrega de notificaciones.
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Indica si corre en el despliegue de producción real. */
function esProduccion(): boolean
{
  return process.env.VERCEL_ENV === "production";
}

export async function POST()
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
        { error: "Tenés que iniciar sesión para verificar el pago." },
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
      .select("id, suscripcion_estado, suscripcion_vence_en, suscripcion_cancelada_en")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de verificar el pago." },
        { status: 400 },
      );
    }

    const fila = negocio as {
      id: string;
      suscripcion_estado?: unknown;
      suscripcion_vence_en?: unknown;
      suscripcion_cancelada_en?: unknown;
    };
    const resultado = await subscriptionService.reconciliar(fila.id);

    // Cierra el drift: si MP ya no tiene la suscripción pero el estado local
    // quedó activo o en mora (p. ej. se canceló desde MP), se limpia el plan.
    // Se exceptúa la ventana "cancelada pero activa": el dueño conserva el
    // acceso hasta `suscripcion_vence_en`, aunque MP ya no liste el preapproval.
    if (resultado.estado === "none")
    {
      const local = typeof fila.suscripcion_estado === "string" ? fila.suscripcion_estado : null;
      const canceladaEn = typeof fila.suscripcion_cancelada_en === "string"
        ? fila.suscripcion_cancelada_en
        : null;
      const venceEn = typeof fila.suscripcion_vence_en === "string" ? fila.suscripcion_vence_en : null;
      const vencida = venceEn !== null && !Number.isNaN(new Date(venceEn).getTime())
        && new Date(venceEn).getTime() < Date.now();
      const enVentanaPaga = canceladaEn !== null && !vencida;

      if (!enVentanaPaga && (local === "active" || local === "past_due"))
      {
        await subscriptionService.cancelarSuscripcionLocal(fila.id);
      }
    }

    return NextResponse.json(
      {
        success: true,
        estado: resultado.estado,
        activado: resultado.estado === "active",
      },
      { status: 200 },
    );
  }
  catch (error)
  {
    const detalle = error instanceof Error ? error.message : "";
    console.error("[suscripcion/verificar]", detalle);

    if (esProduccion())
    {
      return NextResponse.json(
        { error: "No pudimos verificar el pago. Probá de nuevo." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "No pudimos verificar el pago. Probá de nuevo.", detalle: detalle.slice(0, 300) },
      { status: 502 },
    );
  }
}
