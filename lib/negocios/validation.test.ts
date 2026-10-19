import { describe, expect, it } from "vitest";

import { validarDescripcionNegocio, validarNombreNegocio } from "./validation";

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

describe("validarDescripcionNegocio",
() =>
{
  it("debería recortar y limpiar la descripción",
  () =>
  {
    expect(validarDescripcionNegocio("  Cortes  clásicos  y barba  ")).toBe("Cortes clásicos y barba");
  });

  it("debería devolver null con texto vacío o sólo espacios",
  () =>
  {
    expect(validarDescripcionNegocio("")).toBeNull();
    expect(validarDescripcionNegocio("   ")).toBeNull();
    expect(validarDescripcionNegocio(null)).toBeNull();
    expect(validarDescripcionNegocio(undefined)).toBeNull();
  });

  it("debería rechazar descripciones de más de 300 caracteres",
  () =>
  {
    expect(validarDescripcionNegocio("a".repeat(300))).toBe("a".repeat(300));
    expect(() => validarDescripcionNegocio("a".repeat(301))).toThrow(RangeError);
  });
});
