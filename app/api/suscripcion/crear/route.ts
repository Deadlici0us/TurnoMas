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
    console.error("[suscripcion/crear]", error);

    return NextResponse.json(
      { error: "No pudimos activar el plan. Probá de nuevo." },
      { status: 502 },
    );
  }
}
