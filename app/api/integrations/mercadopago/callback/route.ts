/**
 * Callback del OAuth de MercadoPago: canjea `code` por `access_token`
 * (+ `refresh_token`) y lo guarda en `negocio_secretos` (server-only).
 * Valida que el `state` pertenezca al dueño autenticado antes de guardar.
 * La demo nunca guarda tokens reales.
 */

import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/with-api-handler";

import { isDemoOwner } from "@/lib/auth/demo-guard";
import { readEnv } from "@/lib/env/env";
import { buildMpCallbackUrl, decodificarMpState, exchangeMpCodeForTokens } from "@/lib/payments/mp-oauth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

function redirectDestino(requestUrl: string, destino: string, params: Record<string, string>): NextResponse
{
  const url = new URL(destino, requestUrl);

  for (const [key, value] of Object.entries(params))
  {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

function redirectConfig(requestUrl: string, params: Record<string, string>): NextResponse
{
  return redirectDestino(requestUrl, "/dashboard/config", params);
}

async function handleGET(request: Request)
{
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const remoteError = requestUrl.searchParams.get("error");

  const estado = state !== null && state.trim().length > 0
    ? decodificarMpState(state)
    : null;
  const destino = estado?.next ?? "/dashboard/config";

  if (remoteError !== null)
  {
    return redirectDestino(request.url, destino, { mp: "cancelado" });
  }

  if (code === null || estado === null)
  {
    return redirectDestino(request.url, destino, { mp: "error" });
  }

  const clientId = readEnv("MP_CLIENT_ID");
  const clientSecret = readEnv("MP_CLIENT_SECRET");

  if (clientId === null || clientSecret === null)
  {
    return redirectDestino(request.url, destino, { mp: "error" });
  }

  const callbackUrl = buildMpCallbackUrl(requestUrl.origin);

  if (callbackUrl === null)
  {
    return redirectDestino(request.url, destino, { mp: "error" });
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
      .eq("id", estado.negocioId).eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return redirectDestino(request.url, destino, { mp: "error" });
    }

    if (isDemoOwner({ userId: user.id, email: user.email ?? null }))
    {
      return redirectDestino(request.url, destino, { mp: "demo" });
    }

    const tokens = await exchangeMpCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
    });

    const { error } = await admin.from("negocio_secretos").upsert({
      negocio_id: negocio.id as string,
      mercadopago_access_token: tokens.accessToken,
      mercadopago_refresh_token: tokens.refreshToken,
      mercadopago_user_id: tokens.userId,
      mp_conectado_at: new Date().toISOString(),
    }, { onConflict: "negocio_id" });

    if (error !== null)
    {
      return redirectDestino(request.url, destino, { mp: "error" });
    }

    return redirectDestino(request.url, destino, { mp: "ok" });
  }
  catch
  {
    return redirectDestino(request.url, destino, { mp: "error" });
  }
}

export const GET = withApiHandler("/app/api/integrations/mercadopago/callback", handleGET);
