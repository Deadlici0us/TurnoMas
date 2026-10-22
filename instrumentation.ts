import { logError } from "@/lib/errors/logger";

/**
 * Registra los errores no capturados de Server Components, Actions y Route Handlers.
 *
 * @param error Error original.
 * @param request Datos mínimos de la request.
 * @param context Contexto de ejecución de Next.
 */
export function onRequestError(
  error: unknown,
  request: Readonly<{ path: string; method: string; headers: NodeJS.Dict<string | string[]> }>,
  context: Readonly<{ routePath: string; routeType: string }>,
): void
{
  const header = request.headers["x-request-id"];
  const requestId = Array.isArray(header) ? header[0] : header ?? null;

  logError(error, {
    route: context.routePath,
    action: context.routeType === "action" ? context.routePath : undefined,
    requestId,
  });
}
