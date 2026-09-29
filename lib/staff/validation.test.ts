import { describe, expect, it } from "vitest";

import { validarNombreStaff } from "./validation";

describe("validarNombreStaff",
() =>
{
  it("debería recortar y aceptar nombres de 2 a 80 caracteres",
  () =>
  {
    expect(validarNombreStaff("  Diego  ")).toBe("Diego");
  });

  it("debería rechazar nombres vacíos o de un caracter",
  () =>
  {
    expect(() => validarNombreStaff("")).toThrow(RangeError);
    expect(() => validarNombreStaff("   ")).toThrow(RangeError);
    expect(() => validarNombreStaff("A")).toThrow(RangeError);
  });

  it("debería rechazar nombres de más de 80 caracteres",
  () =>
  {
    expect(() => validarNombreStaff("a".repeat(81))).toThrow(RangeError);
  });

  it("debería rechazar valores no texto",
  () =>
  {
    expect(() => validarNombreStaff(null)).toThrow(RangeError);
    expect(() => validarNombreStaff(42)).toThrow(RangeError);
  });
});
