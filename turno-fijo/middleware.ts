import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|api\\/|.*\\..*).*)"]
};

/**
 * Pass-through intencional: el proyecto no tiene segmento `[locale]`
 * y resuelve todo a es-AR vía `i18n/request.ts` + `app/layout.tsx`.
 * El middleware de next-intl reescribía `/` → `/es-AR` (ruta inexistente)
 * y devolvía 404 en todas las páginas.
 * Solo propaga el header de locale que `next-intl/server` espera.
 * Restaurar `createMiddleware` cuando se agreguen rutas `[locale]`.
 */
export default function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("X-NEXT-INTL-LOCALE", "es-AR");
  return NextResponse.next({ request: { headers } });
}
