import { unstable_rethrow } from "next/navigation";

import { logError } from "@/lib/errors/logger";
import { toAppError } from "@/lib/errors/to-app-error";
import { fail, ok } from "./action-result";
import type { ActionResult } from "./action-result";

/**
 * Ejecuta una acción y traduce cualquier excepción a un resultado serializable.
 *
 * Preserva los errores internos de navegación de Next (`redirect`, `notFound`).
 *
 * @param name Nombre de la acción para los logs.
 * @param fn Lógica de negocio.
 * @return Resultado exitoso o fallido.
 */
export async function runAction<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>>
{
  try
  {
    return ok(await fn());
  }
  catch (error)
  {
    unstable_rethrow(error);

    const appError = toAppError(error);
    logError(error, { action: name });

    return fail(appError.code, appError.message);
  }
}
