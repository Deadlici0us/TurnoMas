import { createHash, createHmac, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { POST as webhookPost } from "@/app/api/webhooks/route";
import { readEnv } from "@/lib/env/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { subscriptionService } from "@/lib/services/subscription";
import { construirManifestMp } from "@/lib/webhooks/mercadopago";

/**
 * Endpoint temporal de diagnóstico para webhooks de suscripción.
 *
 * Solo responde cuando `MP_WEBHOOK_DIAG` está configurado. Nunca expone
 * valores de secretos: solo longitud y fingerprint (hash) para comparar.
 */
export async function GET(request: Request): Promise<ReturnType<typeof NextResponse.json>>
{
  if (readEnv("MP_WEBHOOK_DIAG") === null)
  {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const token = readEnv("MP_ACCESS_TOKEN");
  const secret = readEnv("MP_WEBHOOK_SECRET");
  const params = new URL(request.url).searchParams;
  const preapprovalId = params.get("preapproval");

  const resultado: Record<string, unknown> = {
    tokenLen: token !== null ? token.length : null,
    tokenFp: fingerprint(token),
    secretLen: secret !== null ? secret.length : null,
    secretFp: fingerprint(secret),
    secretPrefix: secret !== null ? secret.slice(0, 7) : null,
  };

  await probarSupabase(resultado);
  await probarToken(token, resultado);
  calcularFirma(params, secret, resultado);

  if (preapprovalId !== null && preapprovalId.length > 0)
  {
    await probarConsultar(preapprovalId, resultado);
    await reproducirWebhook(preapprovalId, secret, resultado);
  }

  return NextResponse.json(resultado);
}

/** Prueba lectura mínima a Supabase (tabla `negocios`). */
async function probarSupabase(resultado: Record<string, unknown>): Promise<void>
{
  try
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").select("id").limit(1);

    resultado.supabase = error === null ? "ok" : "error";
    resultado.supabaseError = error !== null ? error.message : null;
  }
  catch (error)
  {
    resultado.supabase = "throw";
    resultado.supabaseError = error instanceof Error ? error.message : String(error);
  }
}

/** Consulta el preapproval con el token de plataforma del deploy. */
async function probarConsultar(preapprovalId: string, resultado: Record<string, unknown>): Promise<void>
{
  try
  {
    resultado.estado = await subscriptionService.consultarEstado(preapprovalId);
  }
  catch (error)
  {
    resultado.error = error instanceof Error ? error.message : String(error);
    resultado.errorNombre = error instanceof Error ? error.name : null;
  }
}

/** Reproduce el POST del webhook firmado con el secreto del deploy. */
async function reproducirWebhook(
  preapprovalId: string,
  secret: string | null,
  resultado: Record<string, unknown>,
): Promise<void>
{
  if (secret === null)
  {
    resultado.webhookStatus = "sin-secreto";

    return;
  }

  const ts = String(Date.now());
  const requestId = `diag-${randomUUID()}`;
  const manifest = construirManifestMp(preapprovalId, requestId, ts);
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  const url = `https://turno-mas.vercel.app/api/webhooks?data.id=${preapprovalId}&type=subscription_preapproval`;
  const request = new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "subscription_preapproval", action: "updated", data: { id: preapprovalId } }),
  });

  try
  {
    const response = await webhookPost(request);

    resultado.webhookStatus = response.status;
    resultado.webhookBody = await response.json().catch(() => "<no-json>");
  }
  catch (error)
  {
    resultado.webhookThrow = error instanceof Error ? error.message : String(error);
  }
}

/** Identifica la app dueña del token del deploy y su acceso a cada app. */
async function probarToken(token: string | null, resultado: Record<string, unknown>): Promise<void>
{
  if (token === null)
  {
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  try
  {
    const me = await fetch("https://api.mercadopago.com/users/me", { headers });
    const cuerpo = await me.json() as { id?: unknown; nickname?: unknown };

    resultado.meId = cuerpo.id ?? null;
    resultado.meNick = cuerpo.nickname ?? null;
  }
  catch (error)
  {
    resultado.meError = error instanceof Error ? error.message : String(error);
  }

  const apps: ReadonlyArray<readonly [string, string]> = [
    ["app5282", "5282452571447268"],
    ["app8240", "8240978704835778"],
  ];

  for (const [clave, id] of apps)
  {
    try
    {
      const r = await fetch(`https://api.mercadopago.com/applications/${id}`, { headers });
      const propio = r.status === 200 ? await r.json() as { name?: unknown } : null;

      resultado[clave] = propio !== null ? `200:${String(propio.name)}` : r.status;
    }
    catch (error)
    {
      resultado[clave] = error instanceof Error ? error.message : String(error);
    }
  }
}

/**
 * Calcula el HMAC del manifiesto oficial con el secreto del deploy.
 *
 * Con `id`, `rid` y `ts` en el query permite comparar contra la firma
 * `v1` real que envió MercadoPago y así aislar si el problema es el
 * secreto o el manifiesto. No expone el secreto, solo el HMAC resultante.
 */
function calcularFirma(
  params: URLSearchParams,
  secret: string | null,
  resultado: Record<string, unknown>,
): void
{
  const id = params.get("id");
  const rid = params.get("rid");
  const ts = params.get("ts");

  if (id === null || ts === null || secret === null)
  {
    return;
  }

  const manifest = construirManifestMp(id, rid, ts);

  resultado.manifest = manifest;
  resultado.hmac = createHmac("sha256", secret).update(manifest).digest("hex");
}

/** Devuelve un fingerprint no reversible (primeros 16 hex de sha256). */
function fingerprint(value: string | null): string | null
{
  if (value === null || value.length === 0)
  {
    return null;
  }

  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
