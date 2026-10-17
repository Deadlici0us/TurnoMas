import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { readEnv } from "@/lib/env/env";
import { subscriptionService } from "@/lib/services/subscription";

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
  const preapprovalId = new URL(request.url).searchParams.get("preapproval");

  const resultado: Record<string, unknown> = {
    tokenLen: token !== null ? token.length : null,
    tokenFp: fingerprint(token),
    secretLen: secret !== null ? secret.length : null,
    secretFp: fingerprint(secret),
  };

  if (preapprovalId !== null && preapprovalId.length > 0)
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

  return NextResponse.json(resultado);
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
