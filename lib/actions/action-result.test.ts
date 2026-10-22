import { describe, expect, it } from "vitest";

import { fail, ok } from "./action-result";

describe("ActionResult",
() =>
{
  it("debería construir un resultado exitoso con datos",
  () =>
  {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
  });

  it("debería construir un resultado exitoso sin datos",
  () =>
  {
    expect(ok()).toEqual({ ok: true, data: undefined });
  });

  it("debería construir un fallo tipado",
  () =>
  {
    expect(fail("CONFLICT", "No se puede")).toEqual({
      ok: false,
      code: "CONFLICT",
      error: "No se puede",
    });
  });
});
