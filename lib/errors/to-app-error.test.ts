import { describe, expect, it } from "vitest";

import { ConflictError } from "./conflict-error";
import { ForbiddenError } from "./forbidden-error";
import { NotFoundError } from "./not-found-error";
import { toAppError } from "./to-app-error";
import { UnexpectedError } from "./unexpected-error";
import { ValidationError } from "./validation-error";

describe("toAppError",
() =>
{
  it("debería devolver el mismo AppError",
  () =>
  {
    const original = new ConflictError("Choca");

    expect(toAppError(original)).toBe(original);
  });

  it("debería mapear violación de clave foránea a conflicto",
  () =>
  {
    const error = toAppError({ code: "23503", message: "fk" });

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.status).toBe(409);
  });

  it("debería mapear duplicados a conflicto",
  () =>
  {
    const error = toAppError({ code: "23505", message: "duplicado" });

    expect(error).toBeInstanceOf(ConflictError);
  });

  it("debería mapear checks a validación",
  () =>
  {
    const error = toAppError({ code: "23514", message: "check" });

    expect(error).toBeInstanceOf(ValidationError);
  });

  it("debería mapear permisos de RLS a prohibido",
  () =>
  {
    const error = toAppError({ code: "42501", message: "rls" });

    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it("debería mapear fila inexistente a no encontrado",
  () =>
  {
    const error = toAppError({ code: "PGRST116", message: "sin filas" });

    expect(error).toBeInstanceOf(NotFoundError);
  });

  it("debería mapear los errores de validación a validación",
  () =>
  {
    const error = toAppError(new RangeError("El nombre es muy corto"));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("El nombre es muy corto");
  });


  it("debería reconocer errores de sesión de Supabase",
  () =>
  {
    const error = toAppError({ name: "AuthSessionMissingError", message: "sin sesión" });

    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHENTICATED");
  });

  it("no debería filtrar el mensaje de un error inesperado",
  () =>
  {
    const error = toAppError(new Error("password=secreto"));

    expect(error).toBeInstanceOf(UnexpectedError);
    expect(error.message).not.toContain("secreto");
  });
});
