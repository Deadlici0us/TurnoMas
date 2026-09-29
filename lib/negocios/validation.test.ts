import { describe, expect, it } from "vitest";

import { validarNombreNegocio } from "./validation";

describe("validarNombreNegocio",
() =>
{
  it("debería recortar y aceptar nombres de 2 a 80 caracteres",
  () =>
  {
    expect(validarNombreNegocio("  Barbería Diego  ")).toBe("Barbería Diego");
  });

  it("debería rechazar nombres vacíos, cortos o muy largos",
  () =>
  {
    expect(() => validarNombreNegocio("")).toThrow(RangeError);
    expect(() => validarNombreNegocio("A")).toThrow(RangeError);
    expect(() => validarNombreNegocio("a".repeat(81))).toThrow(RangeError);
  });
});
