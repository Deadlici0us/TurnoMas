import { redirect } from "next/navigation";

import { logError } from "@/lib/errors/logger";

/** Indica si el error es un control de flujo interno de Next. */
function esErrorDeNavegacion(error: unknown): boolean
{
  if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT"))
  {
    return true;
  }

  if (typeof error !== "object" || error === null || !("digest" in error))
  {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;

  return typeof digest === "string"
    && (digest.startsWith("NEXT_REDIRECT")
      || digest.startsWith("NEXT_NOT_FOUND")
      || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
      || digest.startsWith("NEXT_PRERENDER_INTERRUPTED"));
}

/**
 * Envuelve una acción que usa `redirect` y manda los errores inesperados a una página con mensaje.
 *
 * @param name Nombre de la acción para los logs.
 * @param action Lógica original.
 * @param errorPath Ruta a la que redirigir ante un error inesperado.
 * @return Acción con el mismo contrato que la original.
 */
export function withRedirectAction<A extends unknown[], R>(
  name: string,
  action: (...args: A) => Promise<R>,
  errorPath: string,
): (...args: A) => Promise<R>
{
  return async (...args: A): Promise<R> =>
  {
    try
    {
      return await action(...args);
    }
    catch (error)
    {
      if (esErrorDeNavegacion(error))
      {
        throw error;
      }

      logError(error, { action: name });
      redirect(errorPath);
    }
  };
}
