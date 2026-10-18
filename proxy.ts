import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveAccess } from "@/lib/auth/access";
import { resolveAccessRedirect } from "@/lib/auth/route-guard";
import { buildCspPolicy } from "@/lib/security/csp";

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)"]
};

const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";
const LOCALE = "es-AR";

/** Genera un nonce por request (hex válido como base64-value de CSP). */
function crearNonce(): string
{
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Proxy/middleware de acceso (Next 16).
 *
 * Propaga el locale es-AR que `next-intl/server` espera, aplica las
 * redirecciones de acceso (raíz según sesión y bloqueo por servicio vencido) y
 * agrega un Content-Security-Policy con nonce por request (defensa XSS).
 *
 * @param request Request entrante.
 * @return Passthrough con locale y CSP, o redirect de acceso.
 */
export async function proxy(request: NextRequest): Promise<NextResponse>
{
  const nonce = crearNonce();
  const csp = buildCspPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, LOCALE);
  requestHeaders.set("x-nonce", nonce);
  // Next lee el nonce del CSP del request y lo inyecta en sus <script>.
  requestHeaders.set("Content-Security-Policy", csp);

  const { snapshot, response } = await resolveAccess(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);

  const destination = resolveAccessRedirect(request.nextUrl.pathname, snapshot);

  if (destination === null)
  {
    return response;
  }

  const redirect = NextResponse.redirect(new URL(destination, request.url));
  redirect.headers.set("Content-Security-Policy", csp);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

  return redirect;
}

export default proxy;
