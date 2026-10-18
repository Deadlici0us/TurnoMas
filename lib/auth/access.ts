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
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";

const DEMO_COOKIE = "session";
const DEMO_VALUE = "demo";

/** Ventana de caché del rescate en línea (no reverificar en cada request). */
const RESCATE_CACHE_MS = 5 * 60_000;

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
  readonly id: string | null;
  readonly created_at: string | null;
  readonly suscripcion_estado: string | null;
  readonly suscripcion_mp_id: string | null;
  readonly suscripcion_mora_desde: string | null;
  readonly suscripcion_vence_en: string | null;
  readonly suscripcion_cancelada_en: string | null;
  readonly suscripcion_mp_status: string | null;
  readonly suscripcion_verificada_en: string | null;
}

/** Indica si una verificación contra MP es lo bastante reciente (caché). */
function verificacionReciente(valor: string | null): boolean
{
  if (valor === null)
  {
    return false;
  }

  const instante = new Date(valor).getTime();

  return Number.isFinite(instante) && Date.now() - instante < RESCATE_CACHE_MS;
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
      .select("id, created_at, suscripcion_estado, suscripcion_mp_id, suscripcion_mora_desde, suscripcion_vence_en, suscripcion_cancelada_en, suscripcion_mp_status, suscripcion_verificada_en")
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

  let subscription: SubscriptionStatus = getNegocioSubscriptionStatus({
    created_at: negocio.created_at,
    suscripcion_estado: negocio.suscripcion_estado,
    suscripcion_mp_id: negocio.suscripcion_mp_id,
    suscripcion_mora_desde: negocio.suscripcion_mora_desde,
    suscripcion_vence_en: negocio.suscripcion_vence_en,
    suscripcion_cancelada_en: negocio.suscripcion_cancelada_en,
    suscripcion_mp_status: negocio.suscripcion_mp_status,
  });

  // Rescate en línea (Capa 5): si el espejo local dice `blocked` pero MP sigue
  // con la suscripción autorizada, se evita el falso paywall. Sólo corre en el
  // borde del bloqueo, con caché por `suscripcion_verificada_en`; si MP no
  // responde se mantiene el snapshot local (fail-closed).
  const puedeRescatar = subscription === "blocked"
    && typeof negocio.id === "string" && negocio.id.length > 0
    && typeof negocio.suscripcion_mp_id === "string" && negocio.suscripcion_mp_id.length > 0
    && !verificacionReciente(negocio.suscripcion_verificada_en);

  if (puedeRescatar)
  {
    try
    {
      const rescate = await subscriptionService.verificarPreapproval(
        negocio.id as string, negocio.suscripcion_mp_id as string);

      if (rescate.activo)
      {
        subscription = "active";
      }
    }
    catch
    {
      // Best-effort: sin MP se conserva la decisión local.
    }
  }

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
