/**
 * Crea la suscripción SaaS (plan de MercadoPago) para el negocio del dueño.
 *
 * Recibe el token de tarjeta generado por el Card Brick y el email del
 * pagador; con eso crea el preapproval autorizado sobre el plan AR. La demo
 * nunca suscribe (403).
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

interface CrearBody
{
  readonly cardTokenId?: unknown;
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

  let body: CrearBody | null = null;

  try
  {
    body = (await request.json()) as CrearBody;
  }
  catch
  {
    body = null;
  }

  const cardTokenId = typeof body?.cardTokenId === "string" ? body.cardTokenId.trim() : "";
  const emailPagador = typeof body?.payerEmail === "string" ? body.payerEmail.trim() : "";

  if (cardTokenId.length === 0)
  {
    return NextResponse.json({ error: "Falta el token de la tarjeta." }, { status: 400 });
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

    const payerEmail = emailPagador.length > 0
      ? emailPagador
      : (typeof user.email === "string" ? user.email : "");

    if (payerEmail.length === 0)
    {
      return NextResponse.json(
        { error: "Necesitamos el email del pagador para el débito mensual." },
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
      cardTokenId,
    );

    if (preapproval.status === "authorized")
    {
      await subscriptionService.activarSuscripcion(fila.id, preapproval.id);
    }

    return NextResponse.json(
      { success: true, preapprovalId: preapproval.id, status: preapproval.status },
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
