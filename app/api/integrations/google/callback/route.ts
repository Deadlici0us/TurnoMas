/**
 * Callback del OAuth de Google Calendar: canjea `code` por `refresh_token`
 * y lo guarda en `negocio_secretos` (server-only). Valida que el `state`
 * pertenezca al dueño autenticado antes de guardar.
 */

import { NextResponse } from "next/server";

import { buildGoogleCallbackUrl, exchangeCodeForTokens } from "@/lib/calendar/google-oauth";
import { readEnv } from "@/lib/env/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

function redirectConfig(requestUrl: string, params: Record<string, string>): NextResponse
{
  const url = new URL("/dashboard/config", requestUrl);

  for (const [key, value] of Object.entries(params))
  {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: Request)
{
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const remoteError = requestUrl.searchParams.get("error");

  if (remoteError !== null)
  {
    return redirectConfig(request.url, { gcal: "cancelado" });
  }

  if (code === null || state === null || state.trim().length === 0)
  {
    return redirectConfig(request.url, { gcal: "error" });
  }

  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");

  if (clientId === null || clientSecret === null)
  {
    return redirectConfig(request.url, { gcal: "error" });
  }

  const callbackUrl = buildGoogleCallbackUrl(requestUrl.origin);

  if (callbackUrl === null)
  {
    return redirectConfig(request.url, { gcal: "error" });
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
      .eq("id", state).eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return redirectConfig(request.url, { gcal: "error" });
    }

    const tokens = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
    });

    if (tokens.refreshToken === null)
    {
      return redirectConfig(request.url, { gcal: "sin-refresh" });
    }

    const { error } = await admin.from("negocio_secretos").upsert({
      negocio_id: negocio.id as string,
      google_refresh_token: tokens.refreshToken,
      google_conectado_at: new Date().toISOString(),
    }, { onConflict: "negocio_id" });

    if (error !== null)
    {
      return redirectConfig(request.url, { gcal: "error" });
    }

    return redirectConfig(request.url, { gcal: "ok" });
  }
  catch
  {
    return redirectConfig(request.url, { gcal: "error" });
  }
}
