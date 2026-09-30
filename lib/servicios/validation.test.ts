import { describe, expect, it } from "vitest";

import { validarServicio } from "./validation";

const BASE = {
  nombre: "Corte clásico",
  duracionMin: 30,
  precioBase: 1500000,
  precioPromocional: null as number | null,
  senaRequerida: true,
  senaPorcentaje: 50,
};

describe("validarServicio",
() =>
{
  it("debería normalizar un servicio válido",
  () =>
  {
    expect(validarServicio(BASE)).toEqual({
      nombre: "Corte clásico",
      duracionMin: 30,
      precioBase: 1500000,
      precioPromocional: null,
      senaRequerida: true,
      senaPorcentaje: 50,
    });
  });

  it("debería aceptar promo menor al precio base y sena desactivada",
  () =>
  {
    const result = validarServicio({ ...BASE, precioPromocional: 1200000, senaRequerida: false });

    expect(result.precioPromocional).toBe(1200000);
    expect(result.senaRequerida).toBe(false);
  });

  it("debería rechazar nombre corto, duración o precio inválidos",
  () =>
  {
    expect(() => validarServicio({ ...BASE, nombre: "X" })).toThrow(RangeError);
    expect(() => validarServicio({ ...BASE, duracionMin: 0 })).toThrow(RangeError);
    expect(() => validarServicio({ ...BASE, precioBase: 0 })).toThrow(RangeError);
    expect(() => validarServicio({ ...BASE, senaPorcentaje: 101 })).toThrow(RangeError);
  });

  it("debería rechazar promo mayor o igual al precio base",
  () =>
  {
    expect(() => validarServicio({ ...BASE, precioPromocional: 1500000 })).toThrow(RangeError);
    expect(() => validarServicio({ ...BASE, precioPromocional: 9999999 })).toThrow(RangeError);
  });
});
