import { AppError } from "./app-error";

/** Contexto mínimo para correlacionar un error con su operación. */
export interface ErrorContext
{
  readonly action?: string;
  readonly route?: string;
  readonly requestId?: string | null;
}

/** Extrae un código de error sin asumir una forma concreta. */
function leerCodigo(error: unknown): string | undefined
{
  if (error instanceof AppError)
  {
    return error.code;
  }

  if (typeof error === "object" && error !== null && "code" in error)
  {
    const code = (error as { code?: unknown }).code;

    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

/** Lee el digest de Next sin exponer el error completo. */
function leerDigest(error: unknown): string | undefined
{
  if (typeof error === "object" && error !== null && "digest" in error)
  {
    const digest = (error as { digest?: unknown }).digest;

    return typeof digest === "string" ? digest : undefined;
  }

  return undefined;
}

/**
 * Loguea un error en formato estructurado sin incluir secretos ni datos personales.
 *
 * @param error Error original.
 * @param context Acción o ruta donde ocurrió.
 */
export function logError(error: unknown, context: ErrorContext = {}): void
{
  const payload = {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    code: leerCodigo(error),
    digest: leerDigest(error),
    ...context,
  };

  console.error("[turnomas:error]", JSON.stringify(payload));
}
