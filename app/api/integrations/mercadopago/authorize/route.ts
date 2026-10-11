/**
 * Inicio del OAuth de MercadoPago: redirige al consentimiento del vendedor
 * para cobrar señas delegadas. El `state` lleva el negocio.id.
 * La demo nunca conecta cuentas reales (403).
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { buildMpAuthorizeUrl, buildMpCallbackUrl, codificarMpState, sanearNext } from "@/lib/payments/mp-oauth";
import { readEnv } from "@/lib/env/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request)
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

  const clientId = readEnv("MP_CLIENT_ID");

  if (clientId === null)
  {
    return NextResponse.json({ error: "Falta configurar MP_CLIENT_ID en el entorno." }, { status: 500 });
  }

  let origin: string | null = null;

  try
  {
    origin = new URL(request.url).origin;
  }
  catch
  {
    origin = null;
  }

  const callbackUrl = buildMpCallbackUrl(origin);

  if (callbackUrl === null)
  {
    return NextResponse.json({ error: "No pudimos resolver la URL de retorno de MercadoPago." }, { status: 500 });
  }

  let next: string | null = null;

  try
  {
    next = sanearNext(new URL(request.url).searchParams.get("next"));
  }
  catch
  {
    next = null;
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user === null)
    {
      return NextResponse.redirect(new URL("/login?next=/dashboard/config", request.url));
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
    const { data: negocio } = await admin.from("negocios").select("id")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json({ error: "Creá tu negocio antes de conectar MercadoPago." }, { status: 400 });
    }

    const authorizeUrl = buildMpAuthorizeUrl({
      clientId,
      callbackUrl,
      state: codificarMpState({ negocioId: negocio.id as string, next }),
    });

    return NextResponse.redirect(authorizeUrl);
  }
  catch
  {
    return NextResponse.json({ error: "No pudimos iniciar la conexión con MercadoPago." }, { status: 500 });
  }
}
