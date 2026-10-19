import { describe, expect, it } from "vitest";

import {
  calcularNuevaVigencia,
  calcularPrecioConPromo,
  promocionVigente,
  sumarMeses,
} from "./promocion";

describe("calcularPrecioConPromo",
() =>
{
  it("debería devolver el precio base sin promo",
  () =>
  {
    expect(calcularPrecioConPromo(14999, null)).toEqual({
      montoBase: 14999,
      montoFinal: 14999,
      porcentaje: null,
      aplicada: false,
    });
  });

  it("debería aplicar un porcentaje y redondear al entero",
  () =>
  {
    expect(calcularPrecioConPromo(14999, {
      porcentaje: 20,
      vigenteDesde: "2026-10-01T00:00:00Z",
      vigenteHasta: "2026-11-01T00:00:00Z",
    }, new Date("2026-10-19T12:00:00Z"))).toEqual({
      montoBase: 14999,
      montoFinal: 11999,
      porcentaje: 20,
      aplicada: true,
    });
  });

  it("debería respetar el mínimo de 1 unidad",
  () =>
  {
    expect(calcularPrecioConPromo(100, {
      porcentaje: 99,
      vigenteDesde: "2026-10-01T00:00:00Z",
      vigenteHasta: "2026-11-01T00:00:00Z",
    }, new Date("2026-10-19T12:00:00Z")).montoFinal).toBe(1);
  });

  it("debería cobrar el precio base cuando la promo venció",
  () =>
  {
    const resultado = calcularPrecioConPromo(14999, {
      porcentaje: 50,
      vigenteDesde: "2026-09-01T00:00:00Z",
      vigenteHasta: "2026-10-01T00:00:00Z",
    }, new Date("2026-10-19T12:00:00Z"));

    expect(resultado.aplicada).toBe(false);
    expect(resultado.montoFinal).toBe(14999);
  });

  it("debería cobrar el precio base cuando la promo todavía no empezó",
  () =>
  {
    const resultado = calcularPrecioConPromo(14999, {
      porcentaje: 50,
      vigenteDesde: "2026-11-01T00:00:00Z",
      vigenteHasta: "2026-12-01T00:00:00Z",
    }, new Date("2026-10-19T12:00:00Z"));

    expect(resultado.aplicada).toBe(false);
    expect(resultado.montoFinal).toBe(14999);
  });

  it("debería rechazar montos base inválidos",
  () =>
  {
    for (const monto of [0, -1, 12.5])
    {
      expect(() => calcularPrecioConPromo(monto, null)).toThrow(RangeError);
    }
  });

  it("debería rechazar porcentajes fuera de 1-99",
  () =>
  {
    for (const porcentaje of [0, 100, 101, 12.5])
    {
      expect(() => calcularPrecioConPromo(1000, {
        porcentaje,
        vigenteDesde: "2026-10-01T00:00:00Z",
        vigenteHasta: "2026-11-01T00:00:00Z",
      })).toThrow(RangeError);
    }
  });

  it("debería rechazar fechas inválidas o invertidas",
  () =>
  {
    expect(() => calcularPrecioConPromo(1000, {
      porcentaje: 10,
      vigenteDesde: "no-es-fecha",
      vigenteHasta: "2026-11-01T00:00:00Z",
    })).toThrow(RangeError);

    expect(() => calcularPrecioConPromo(1000, {
      porcentaje: 10,
      vigenteDesde: "2026-11-01T00:00:00Z",
      vigenteHasta: "2026-10-01T00:00:00Z",
    })).toThrow(RangeError);
  });
});

describe("promocionVigente",
() =>
{
  it("debería incluir el inicio y excluir el fin",
  () =>
  {
    const promo = {
      porcentaje: 10,
      vigenteDesde: "2026-10-01T00:00:00Z",
      vigenteHasta: "2026-11-01T00:00:00Z",
    };

    expect(promocionVigente(promo, new Date("2026-10-01T00:00:00Z"))).toBe(true);
    expect(promocionVigente(promo, new Date("2026-11-01T00:00:00Z"))).toBe(false);
  });
});

describe("sumarMeses",
() =>
{
  it("debería sumar meses conservando la hora",
  () =>
  {
    expect(sumarMeses(new Date("2026-10-19T12:30:00Z"), 3).toISOString())
      .toBe("2027-01-19T12:30:00.000Z");
  });

  it("debería ajustar el fin de mes al último día disponible",
  () =>
  {
    expect(sumarMeses(new Date("2026-01-31T00:00:00Z"), 1).toISOString())
      .toBe("2026-02-28T00:00:00.000Z");
    expect(sumarMeses(new Date("2024-01-31T00:00:00Z"), 1).toISOString())
      .toBe("2024-02-29T00:00:00.000Z");
  });

  it("debería rechazar meses no positivos",
  () =>
  {
    expect(() => sumarMeses(new Date(), 0)).toThrow(RangeError);
    expect(() => sumarMeses(new Date(), -1)).toThrow(RangeError);
  });
});

describe("calcularNuevaVigencia",
() =>
{
  const ahora = new Date("2026-10-19T12:00:00Z");

  it("debería sumar desde el vencimiento actual si sigue vigente",
  () =>
  {
    expect(calcularNuevaVigencia("2026-11-10T00:00:00Z", 2, ahora).toISOString())
      .toBe("2027-01-10T00:00:00.000Z");
  });

  it("debería sumar desde ahora si ya venció",
  () =>
  {
    expect(calcularNuevaVigencia("2026-09-10T00:00:00Z", 1, ahora).toISOString())
      .toBe("2026-11-19T12:00:00.000Z");
  });

  it("debería sumar desde ahora sin vencimiento previo",
  () =>
  {
    expect(calcularNuevaVigencia(null, 1, ahora).toISOString())
      .toBe("2026-11-19T12:00:00.000Z");
  });
});
