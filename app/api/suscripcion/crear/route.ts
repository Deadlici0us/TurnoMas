/**
 * Crea la suscripción SaaS (Preapproval 14.999 ARS/mes) para el negocio
 * del dueño y devuelve el link de autorización de MercadoPago.
 * La demo nunca suscribe (403).
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

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

    if (typeof user.email !== "string" || user.email.trim().length === 0)
    {
      return NextResponse.json(
        { error: "Necesitamos tu email para el débito mensual." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: negocio } = await admin.from("negocios").select("id")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de activar el plan." },
        { status: 400 },
      );
    }

    const preapproval = await subscriptionService.crearParaNegocio(
      negocio.id as string,
      user.email,
    );

    return NextResponse.json(
      { success: true, preapprovalId: preapproval.id, initPoint: preapproval.initPoint },
      { status: 200 },
    );
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos crear la suscripción." },
      { status: 502 },
    );
  }
}
