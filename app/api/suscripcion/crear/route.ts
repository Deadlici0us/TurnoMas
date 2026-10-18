/**
 * Crea la suscripción SaaS (sin plan, `pending`) para el negocio del dueño.
 *
 * Recibe el email de la cuenta de MercadoPago del pagador y devuelve el
 * `init_point` para que complete el checkout (saldo en cuenta o tarjeta).
 * La activación ocurre cuando MP confirma la autorización (webhook).
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

interface CrearBody
{
  readonly payerEmail?: unknown;
}

/** Indica si corre en el despliegue de producción real. */
function esProduccion(): boolean
{
  return process.env.VERCEL_ENV === "production";
}

/** Traduce los rechazos frecuentes de MercadoPago a un mensaje accionable. */
function mensajeDeError(detalle: string): string
{
  const texto = detalle.toLowerCase();

  if (texto.includes("both payer and collector")
    || texto.includes("payer and collector")
    || texto.includes("payer_email"))
  {
    return "Usá el email de la misma cuenta de MercadoPago con la que vas a pagar.";
  }

  if (texto.includes("guest_site_mismatch") || texto.includes("different site"))
  {
    return "Ese email pertenece a una cuenta de MercadoPago de otro país. Usá una cuenta de Argentina.";
  }

  return "No pudimos activar el plan. Probá de nuevo.";
}

export async function POST(request: Request)
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
        { error: "Tenés que iniciar sesión para activar el plan." },
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

    let body: CrearBody | null = null;

    try
    {
      body = (await request.json()) as CrearBody;
    }
    catch
    {
      body = null;
    }

    const emailPagador = typeof body?.payerEmail === "string" ? body.payerEmail.trim() : "";
    const payerEmail = emailPagador.length > 0
      ? emailPagador
      : (typeof user.email === "string" ? user.email : "");

    if (payerEmail.length === 0)
    {
      return NextResponse.json(
        { error: "Necesitamos el email de tu cuenta de MercadoPago." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: negocio } = await admin.from("negocios").select("id, pais")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de activar el plan." },
        { status: 400 },
      );
    }

    const fila = negocio as { id: string; pais?: unknown };

    try
    {
      const reconciliacion = await subscriptionService.reconciliar(fila.id);

      if (reconciliacion.estado === "active")
      {
        return NextResponse.json(
          { success: true, activado: true, estado: "active" },
          { status: 200 },
        );
      }

      if (reconciliacion.estado === "pending" && reconciliacion.initPoint !== null)
      {
        return NextResponse.json(
          {
            success: true,
            preapprovalId: reconciliacion.preapprovalId,
            initPoint: reconciliacion.initPoint,
            status: "pending",
            reusado: true,
          },
          { status: 200 },
        );
      }
    }
    catch (error)
    {
      console.error("[suscripcion/crear] reconciliación", error instanceof Error ? error.message : error);
    }

    const preapproval = await subscriptionService.crearParaNegocio(
      fila.id,
      payerEmail,
      typeof fila.pais === "string" ? fila.pais : null,
    );

    return NextResponse.json(
      {
        success: true,
        preapprovalId: preapproval.id,
        initPoint: preapproval.initPoint,
        status: preapproval.status,
      },
      { status: 200 },
    );
  }
  catch (error)
  {
    const detalle = error instanceof Error ? error.message : "";
    console.error("[suscripcion/crear]", detalle);

    if (esProduccion())
    {
      return NextResponse.json(
        { error: "No pudimos activar el plan. Probá de nuevo." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: mensajeDeError(detalle), detalle: detalle.slice(0, 300) },
      { status: 502 },
    );
  }
}
