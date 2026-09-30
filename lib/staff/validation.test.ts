import { describe, expect, it } from "vitest";

import { validarHorariosStaff, validarNombreStaff } from "./validation";

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
