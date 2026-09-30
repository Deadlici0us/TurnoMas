/**
 * Inicio del OAuth de Google Calendar: redirige al consentimiento con
 * `access_type=offline` para obtener `refresh_token` por negocio.
 */

import { NextResponse } from "next/server";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { buildGoogleAuthorizeUrl, buildGoogleCallbackUrl } from "@/lib/calendar/google-oauth";
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

  const clientId = readEnv("GOOGLE_CLIENT_ID");

  if (clientId === null)
  {
    return NextResponse.json({ error: "Falta configurar GOOGLE_CLIENT_ID en el entorno." }, { status: 500 });
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

  const callbackUrl = buildGoogleCallbackUrl(origin);

  if (callbackUrl === null)
  {
    return NextResponse.json({ error: "No pudimos resolver la URL de retorno de Google." }, { status: 500 });
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user === null)
    {
      return NextResponse.redirect(new URL("/login?next=/dashboard/config", request.url));
    }

    const admin = getSupabaseAdmin();
    const { data: negocio } = await admin.from("negocios").select("id")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json({ error: "Creá tu negocio antes de conectar Google." }, { status: 400 });
    }

    const authorizeUrl = buildGoogleAuthorizeUrl({
      clientId,
      callbackUrl,
      state: negocio.id as string,
    });

    return NextResponse.redirect(authorizeUrl);
  }
  catch
  {
    return NextResponse.json({ error: "No pudimos iniciar la conexión con Google." }, { status: 500 });
  }
}
