import { describe, expect, it } from "vitest";

import { ConflictError } from "./conflict-error";
import { DemoReadonlyError } from "./demo-readonly-error";
import { ValidationError } from "./validation-error";

describe("AppError",
() =>
{
  it("debería exponer código, estado y nombre en ValidationError",
  () =>
  {
    const error = new ValidationError("Dato inválido");

    expect(error.code).toBe("VALIDATION");
    expect(error.status).toBe(400);
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Dato inválido");
  });

  it("debería permitir códigos de negocio específicos en ConflictError",
  () =>
  {
    const error = new ConflictError("Tiene historial", "staff_con_historial", { total: 2 });

    expect(error.code).toBe("staff_con_historial");
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ total: 2 });
  });

  it("debería marcar la cuenta demo como solo lectura",
  () =>
  {
    const error = new DemoReadonlyError("La demo es de solo lectura");

    expect(error.code).toBe("DEMO_READONLY");
    expect(error.status).toBe(403);
  });
});
