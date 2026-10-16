import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveAccess } from "@/lib/auth/access";
import { resolveAccessRedirect } from "@/lib/auth/route-guard";

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)"]
};

const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";
const LOCALE = "es-AR";

/**
 * Proxy/middleware de acceso (Next 16).
 *
 * Propaga el locale es-AR que `next-intl/server` espera y aplica las
 * redirecciones de acceso: raíz según sesión y bloqueo total por servicio
 * vencido (única excepción: la ruta de adquisición).
 *
 * @param request Request entrante.
 * @return Passthrough con locale o redirect de acceso.
 */
export async function proxy(request: NextRequest): Promise<NextResponse>
{
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, LOCALE);

  const { snapshot, response } = await resolveAccess(request, requestHeaders);
  const destination = resolveAccessRedirect(request.nextUrl.pathname, snapshot);

  if (destination === null)
  {
    return response;
  }

  const redirect = NextResponse.redirect(new URL(destination, request.url));

  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

  return redirect;
}

export default proxy;
