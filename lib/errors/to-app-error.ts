import { DEMO_READONLY_MESSAGE } from "@/lib/auth/demo-guard";
import { AppError } from "./app-error";
import { AuthError } from "./auth-error";
import { ConflictError } from "./conflict-error";
import { DemoReadonlyError } from "./demo-readonly-error";
import { ForbiddenError } from "./forbidden-error";
import { NotFoundError } from "./not-found-error";
import { UnexpectedError } from "./unexpected-error";
import { ValidationError } from "./validation-error";

/** Códigos de PostgreSQL/PostgREST que conocemos. */
const CODIGOS_SUPABASE: Readonly<Record<string, () => AppError>> = {
  "23503": () => new ConflictError(
    "No se puede completar porque hay registros asociados. Desactivá el registro en lugar de eliminarlo.",
    "CONFLICT",
  ),
  "23505": () => new ConflictError("Ya existe un registro con esos datos.", "CONFLICT"),
  "23514": () => new ValidationError("Los datos no cumplen una regla del sistema."),
  "42501": () => new ForbiddenError("No tenés permisos para realizar esta operación."),
  PGRST116: () => new NotFoundError("No encontramos el registro solicitado."),
};

/** Indica si el error tiene forma de error de Supabase/PostgREST. */
function tieneCodigo(error: unknown): error is { readonly code: string }
{
  return typeof error === "object"
    && error !== null
    && "code" in error
    && typeof (error as { code?: unknown }).code === "string";
}

/** Indica si el error parece provenir de Supabase Auth. */
function esErrorDeSesion(error: unknown): boolean
{
  if (typeof error !== "object" || error === null)
  {
    return false;
  }

  const nombre = "name" in error ? (error as { name?: unknown }).name : undefined;

  return typeof nombre === "string" && nombre.toLowerCase().includes("auth");
}

/**
 * Normaliza cualquier error a un error de negocio seguro para el usuario.
 *
 * @param error Error original.
 * @return AppError con código, estado y mensaje mostrable.
 */
export function toAppError(error: unknown): AppError
{
  if (error instanceof AppError)
  {
    return error;
  }

  if (error instanceof Error && error.message === DEMO_READONLY_MESSAGE)
  {
    return new DemoReadonlyError(DEMO_READONLY_MESSAGE);
  }

  if (error instanceof RangeError)
  {
    return new ValidationError(error.message);
  }

  if (tieneCodigo(error))
  {
    const factory = CODIGOS_SUPABASE[error.code];

    if (factory !== undefined)
    {
      return factory();
    }
  }

  if (esErrorDeSesion(error))
  {
    return new AuthError("Tenés que iniciar sesión para continuar.");
  }

  return new UnexpectedError();
}
