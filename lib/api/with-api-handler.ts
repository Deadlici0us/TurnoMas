import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { logError } from "@/lib/errors/logger";
import { toAppError } from "@/lib/errors/to-app-error";

/** Handler de Route Handler sin parámetros dinámicos. */
export type ApiHandler = (request?: Request) => Promise<Response>;

/** Handler original, con o sin parámetro de request. */
type HandlerInput = ApiHandler | ((request: Request) => Promise<Response>);

/**
 * Envuelve un Route Handler para traducir errores a JSON y loguearlos.
 *
 * @param name Nombre de la ruta para los logs.
 * @param handler Lógica original del handler.
 * @return Handler con manejo centralizado de errores.
 */
export function withApiHandler(name: string, handler: HandlerInput): ApiHandler
{
  return async (request?: Request): Promise<Response> =>
  {
    try
    {
      return await (handler as ApiHandler)(request);
    }
    catch (error)
    {
      unstable_rethrow(error);

      const appError = toAppError(error);
      logError(error, {
        route: name,
        requestId: request?.headers.get("x-request-id") ?? null,
      });

      return NextResponse.json({ error: appError.message, code: appError.code }, { status: appError.status });
    }
  };
}
