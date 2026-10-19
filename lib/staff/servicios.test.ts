import { describe, expect, it } from "vitest";

import { serviciosDeStaff, staffOfreceServicio, validarServiciosStaff } from "./servicios";

describe("validarServiciosStaff",
() =>
{
  it("debería normalizar una lista de IDs quitando vacíos y duplicados",
  () =>
  {
    expect(validarServiciosStaff(["a", " b ", "a", "", "c"])).toEqual(["a", "b", "c"]);
  });

  it("debería aceptar una lista vacía",
  () =>
  {
    expect(validarServiciosStaff([])).toEqual([]);
  });

  it("debería rechazar valores que no son listas",
  () =>
  {
    expect(() => validarServiciosStaff("a")).toThrow(RangeError);
    expect(() => validarServiciosStaff(null)).toThrow(RangeError);
  });

  it("debería rechazar IDs que no son texto",
  () =>
  {
    expect(() => validarServiciosStaff([1, 2])).toThrow(RangeError);
  });
});

describe("staffOfreceServicio",
() =>
{
  const par = [{ staffId: "s1", servicioId: "sv1" }];

  it("debería reconocer el par exacto", () =>
  {
    expect(staffOfreceServicio(par, "s1", "sv1")).toBe(true);
  });

  it("debería rechazar un par cruzado", () =>
  {
    expect(staffOfreceServicio(par, "s2", "sv1")).toBe(false);
    expect(staffOfreceServicio(par, "s1", "sv2")).toBe(false);
  });
});

describe("serviciosDeStaff",
() =>
{
  const servicios = [
    { id: "sv1", nombre: "Corte" },
    { id: "sv2", nombre: "Barba" },
    { id: "sv3", nombre: "Color" },
  ];
  const asociaciones = [
    { staffId: "s1", servicioId: "sv1" },
    { staffId: "s1", servicioId: "sv3" },
    { staffId: "s2", servicioId: "sv2" },
  ];

  it("debería devolver solo los servicios del profesional preservando el orden",
  () =>
  {
    expect(serviciosDeStaff(servicios, asociaciones, "s1").map((s) => s.id)).toEqual(["sv1", "sv3"]);
  });

  it("debería devolver vacío cuando el profesional no tiene servicios", () =>
  {
    expect(serviciosDeStaff(servicios, asociaciones, "s3")).toEqual([]);
  });
});
