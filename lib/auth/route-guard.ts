/**
 * Política de redirección por sesión y bloqueo de servicio (Módulo 1).
 *
 * Funciones puras para TDD: deciden si una request debe redirigirse antes
 * de renderizar. La lectura de sesión y suscripción vive en
 * `lib/auth/access.ts`; aquí solo se aplica la regla, de modo que el
 * proxy y los tests compartan exactamente la misma decisión.
 */

import type { SessionState } from "@/lib/auth/session";
import type { SubscriptionStatus } from "@/lib/onboarding/trial";

export const DASHBOARD_ROUTE = "/dashboard";
export const ONBOARDING_ROUTE = "/onboarding";
export const ADQUIRIR_SERVICIO_ROUTE = "/dashboard/suscripcion";

/**
 * Rutas exentas del bloqueo por servicio vencido.
 *
 * La de adquisición es el único destino permitido. `login` y `auth` son
 * exenciones técnicas: sin ellas un usuario bloqueado no podría desloguearse
 * ni reautenticarse y quedaría atrapado en un bucle de redirección.
 */
const RUTAS_EXENTAS_BLOQUEO = ["/login", "/auth"] as const;

/** Foto de acceso resuelta para una request. */
export interface AccessSnapshot
{
  readonly session: SessionState;
  readonly subscription: SubscriptionStatus;
  readonly hasBusiness: boolean;
}

/** Indica si la ruta es exactamente la de adquisición de servicio. */
export function isRutaAdquirirServicio(pathname: string): boolean
{
  return pathname === ADQUIRIR_SERVICIO_ROUTE;
}

/** Indica si la ruta queda exenta del bloqueo por servicio vencido. */
export function isRutaExentaBloqueo(pathname: string): boolean
{
  if (isRutaAdquirirServicio(pathname))
  {
    return true;
  }

  return RUTAS_EXENTAS_BLOQUEO.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

/**
 * Resuelve el destino al entrar a la raíz según sesión y negocio.
 *
 * @param pathname Ruta solicitada.
 * @param session Estado de sesión resuelto.
 * @param hasBusiness Verdadero cuando el dueño ya tiene fila en `negocios`.
 * @return `/dashboard`, `/onboarding` o null cuando la ruta no es la raíz.
 */
export function resolveRootRedirect(
  pathname: string,
  session: SessionState,
  hasBusiness: boolean,
): string | null
{
  if (pathname !== "/" || session !== "authenticated")
  {
    return null;
  }

  return hasBusiness ? DASHBOARD_ROUTE : ONBOARDING_ROUTE;
}

/**
 * Resuelve el destino de un usuario logueado con servicio vencido.
 *
 * @param pathname Ruta solicitada.
 * @param session Estado de sesión resuelto.
 * @param subscription Estado de la suscripción del negocio.
 * @return La ruta de adquisición, o null si deja pasar.
 */
export function resolveBlockedRedirect(
  pathname: string,
  session: SessionState,
  subscription: SubscriptionStatus,
): string | null
{
  if (session !== "authenticated" || subscription !== "blocked")
  {
    return null;
  }

  if (isRutaExentaBloqueo(pathname))
  {
    return null;
  }

  return ADQUIRIR_SERVICIO_ROUTE;
}

/**
 * Decide la redirección de acceso con precedencia del bloqueo.
 *
 * @param pathname Ruta solicitada.
 * @param snapshot Sesión, suscripción y presencia de negocio.
 * @return Destino de redirección o null cuando la request puede continuar.
 */
export function resolveAccessRedirect(pathname: string, snapshot: AccessSnapshot): string | null
{
  const bloqueo = resolveBlockedRedirect(pathname, snapshot.session, snapshot.subscription);

  if (bloqueo !== null)
  {
    return bloqueo;
  }

  return resolveRootRedirect(pathname, snapshot.session, snapshot.hasBusiness);
}
