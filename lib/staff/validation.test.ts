import { describe, expect, it } from "vitest";

import
{
  validarDescripcionStaff,
  validarFotoUrl,
  validarHorariosStaff,
  validarNombreStaff,
} from "./validation";

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

describe("validarHorariosStaff",
() =>
{
  it("debería aceptar franjas separadas por coma y normalizarlas",
  () =>
  {
    expect(validarHorariosStaff({ lun: "09:00-13:00, 15:00-20:00", dom: "" })).toEqual({
      lun: ["09:00-13:00", "15:00-20:00"],
      mar: [],
      mié: [],
      jue: [],
      vie: [],
      sáb: [],
      dom: [],
    });
  });

  it("debería aceptar arrays y tratar ausentes como cerrado",
  () =>
  {
    expect(validarHorariosStaff({ mar: ["10:00-20:00"] }).mar).toEqual(["10:00-20:00"]);
  });

  it("debería rechazar franjas solapadas o con mal formato",
  () =>
  {
    expect(() => validarHorariosStaff({ lun: "09:00-13:00, 12:00-20:00" })).toThrow(RangeError);
    expect(() => validarHorariosStaff({ lun: "9:00-13:00" })).toThrow(RangeError);
    expect(() => validarHorariosStaff(null)).toThrow(RangeError);
  });
});

describe("validarDescripcionStaff",
() =>
{
  it("debería aceptar vacíos como null",
  () =>
  {
    expect(validarDescripcionStaff(null)).toBeNull();
    expect(validarDescripcionStaff(undefined)).toBeNull();
    expect(validarDescripcionStaff("   ")).toBeNull();
  });

  it("debería recortar la descripción y permitir hasta 280",
  () =>
  {
    expect(validarDescripcionStaff("  Especialista en color  ")).toBe("Especialista en color");
    expect(validarDescripcionStaff("a".repeat(280))).toHaveLength(280);
  });

  it("debería rechazar descripciones de más de 280 caracteres",
  () =>
  {
    expect(() => validarDescripcionStaff("a".repeat(281))).toThrow(RangeError);
  });

  it("debería rechazar valores no texto",
  () =>
  {
    expect(() => validarDescripcionStaff(42)).toThrow(RangeError);
  });
});

describe("validarFotoUrl",
() =>
{
  it("debería aceptar vacíos como null",
  () =>
  {
    expect(validarFotoUrl(null)).toBeNull();
    expect(validarFotoUrl(undefined)).toBeNull();
    expect(validarFotoUrl("   ")).toBeNull();
  });

  it("debería aceptar URLs http(s)",
  () =>
  {
    expect(validarFotoUrl("https://cdn.test/foto.jpg")).toBe("https://cdn.test/foto.jpg");
  });

  it("debería rechazar esquemas peligrosos",
  () =>
  {
    expect(() => validarFotoUrl("javascript:alert(1)")).toThrow(RangeError);
  });
});
