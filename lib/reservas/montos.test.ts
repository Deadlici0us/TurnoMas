import { describe, expect, it } from "vitest";

import { calcularMontosReserva } from "./montos";

describe("calcularMontosReserva",
() =>
{
  it("debería usar el precio promocional cuando existe",
  () =>
  {
    const montos = calcularMontosReserva({ precioBase: 2000000, precioPromocional: 1700000, senaRequerida: true,
      senaPorcentaje: 50 });

    expect(montos.montoTotal).toBe(1700000);
    expect(montos.senaMonto).toBe(850000);
    expect(montos.senaPorcentaje).toBe(50);
  });

  it("debería usar el precio base sin promo y sin seña",
  () =>
  {
    const montos = calcularMontosReserva({ precioBase: 800000, precioPromocional: null, senaRequerida: false,
      senaPorcentaje: 50 });

    expect(montos.montoTotal).toBe(800000);
    expect(montos.senaMonto).toBeNull();
    expect(montos.senaPorcentaje).toBe(50);
  });

  it("debería forzar seña del 100% para penalidad de lista negra",
  () =>
  {
    const montos = calcularMontosReserva({ precioBase: 1500000, precioPromocional: null, senaRequerida: true,
      senaPorcentaje: 50, senaForzadaPorListaNegra: true });

    expect(montos.montoTotal).toBe(1500000);
    expect(montos.senaMonto).toBe(1500000);
    expect(montos.senaPorcentaje).toBe(100);
  });

  it("debería rechazar montos inválidos en español",
  () =>
  {
    expect(() => calcularMontosReserva({ precioBase: 0, precioPromocional: null, senaRequerida: false,
      senaPorcentaje: 50 })).toThrow("El precio base debe ser un entero positivo en centavos.");
  });
});
