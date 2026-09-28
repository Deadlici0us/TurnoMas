import { describe, expect, it } from "vitest";

import { estimateMonthlyLoss } from "./loss-calculator";

describe("estimateMonthlyLoss",
() =>
{
  it("debería estimar la pérdida mensual por inasistencias",
  () =>
  {
    const result = estimateMonthlyLoss({
      turnosPorSemana: 20,
      valorPromedio: 15000,
      tasaAusencia: 0.2,
    });

    expect(result).toBe(240000);
  });

  it("debería devolver cero sin ausencias",
  () =>
  {
    expect(
      estimateMonthlyLoss({ turnosPorSemana: 20, valorPromedio: 15000, tasaAusencia: 0 }),
    ).toBe(0);
  });

  it("debería redondear al peso más cercano",
  () =>
  {
    const result = estimateMonthlyLoss({
      turnosPorSemana: 7,
      valorPromedio: 10000,
      tasaAusencia: 0.15,
    });

    expect(result).toBe(42000);
  });

  it("debería rechazar valores inválidos",
  () =>
  {
    expect(() =>
      estimateMonthlyLoss({ turnosPorSemana: 0, valorPromedio: 10000, tasaAusencia: 0.1 }),
    ).toThrow(RangeError);
    expect(() =>
      estimateMonthlyLoss({ turnosPorSemana: 10, valorPromedio: -5, tasaAusencia: 0.1 }),
    ).toThrow(RangeError);
    expect(() =>
      estimateMonthlyLoss({ turnosPorSemana: 10, valorPromedio: 10000, tasaAusencia: 1.5 }),
    ).toThrow(RangeError);
  });
});
