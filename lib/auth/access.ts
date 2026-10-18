/**
 * Resolución de acceso por request para el Proxy (Módulo 1).
 *
 * Une sesión (`demo` por cookie o Supabase Auth) con el estado de
 * suscripción del negocio para producir un `AccessSnapshot` que la
 * política pura de `route-guard.ts` convierte en redirección.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveAuthMode } from "@/lib/auth/auth-mode";
import type { AccessSnapshot } from "@/lib/auth/route-guard";
import type { SubscriptionStatus } from "@/lib/onboarding/trial";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";

const DEMO_COOKIE = "session";
const DEMO_VALUE = "demo";

const SNAPSHOT_GUEST: AccessSnapshot = {
  session: "guest",
  subscription: "trial",
  hasBusiness: false,
};

/** Resultado de resolver el acceso de una request. */
export interface AccessResult
{
  readonly snapshot: AccessSnapshot;
  readonly response: NextResponse;
}

interface NegocioRow
{
  readonly created_at: string | null;
  readonly suscripcion_estado: string | null;
  readonly suscripcion_mp_id: string | null;
  readonly suscripcion_mora_desde: string | null;
  readonly suscripcion_vence_en: string | null;
  readonly suscripcion_cancelada_en: string | null;
}

/** Snapshot demo: la cookie `session=demo` actúa como sesión sin secrets. */
function resolveDemoSnapshot(request: NextRequest): AccessSnapshot
{
  const authenticated = request.cookies.get(DEMO_COOKIE)?.value === DEMO_VALUE;

  if (!authenticated)
  {
    return SNAPSHOT_GUEST;
  }

  return { session: "authenticated", subscription: "trial", hasBusiness: true };
}

/** Busca la fila del negocio del dueño sin exponer datos de suscripción. */
async function consultarNegocio(userId: string): Promise<NegocioRow | null>
{
  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("negocios")
      .select("created_at, suscripcion_estado, suscripcion_mp_id, suscripcion_mora_desde, suscripcion_vence_en, suscripcion_cancelada_en")
      .eq("duenio_id", userId)
      .maybeSingle();

    return (data as NegocioRow | null) ?? null;
  }
  catch
  {
    return null;
  }
}

/** Snapshot con Supabase: valida usuario y deriva negocio + suscripción. */
async function resolveSupabaseAccess(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<AccessResult>
{
  const proxy = createSupabaseProxyClient(request, requestHeaders);

  let userId: string | null = null;

  try
  {
    const { data } = await proxy.supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }
  catch
  {
    userId = null;
  }

  if (userId === null)
  {
    return { snapshot: SNAPSHOT_GUEST, response: proxy.response() };
  }

  const negocio = await consultarNegocio(userId);

  if (negocio === null)
  {
    return {
      snapshot: { session: "authenticated", subscription: "trial", hasBusiness: false },
      response: proxy.response(),
    };
  }

  const subscription: SubscriptionStatus = getNegocioSubscriptionStatus({
    created_at: negocio.created_at,
    suscripcion_estado: negocio.suscripcion_estado,
    suscripcion_mp_id: negocio.suscripcion_mp_id,
    suscripcion_mora_desde: negocio.suscripcion_mora_desde,
    suscripcion_vence_en: negocio.suscripcion_vence_en,
    suscripcion_cancelada_en: negocio.suscripcion_cancelada_en,
  });

  return {
    snapshot: { session: "authenticated", subscription, hasBusiness: true },
    response: proxy.response(),
  };
}

/**
 * Resuelve sesión, negocio y suscripción de la request.
 *
 * @param request Request entrante del proxy.
 * @param requestHeaders Cabeceras mutables que se reenviarán a la app.
 * @return Snapshot de acceso y respuesta passthrough con cookies de sesión.
 */
export async function resolveAccess(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<AccessResult>
{
  if (resolveAuthMode() === "demo")
  {
    return {
      snapshot: resolveDemoSnapshot(request),
      response: NextResponse.next({ request: { headers: requestHeaders } }),
    };
  }

  return resolveSupabaseAccess(request, requestHeaders);
}
