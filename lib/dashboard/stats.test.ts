import { describe, expect, it } from "vitest";

import { calcularStatsDesdeTurnos } from "./stats";

describe("calcularStatsDesdeTurnos",
() =>
{
  it("debería contar estados y sumar solo señas pagadas", () =>
  {
    const stats = calcularStatsDesdeTurnos([
      { estado: "pendiente", sena_monto: 100 },
      { estado: "confirmado", sena_monto: 200 },
      { estado: "pagado", sena_monto: 300 },
      { estado: "pagado", sena_monto: 400 },
      { estado: "completado", sena_monto: 500 },
      { estado: "ausente", sena_monto: 600 },
      { estado: "cancelado", sena_monto: 700 },
    ]);

    expect(stats).toEqual({
      pendientes: 1,
      confirmados: 1,
      pagados: 2,
      completados: 1,
      ausentes: 1,
      cancelados: 1,
      totalIngresos: 700,
    });
  });

  it("debería tolerar turnos sin seña o con estados desconocidos", () =>
  {
    const stats = calcularStatsDesdeTurnos([
      { estado: "pagado", sena_monto: null },
      { estado: "otro" },
    ]);

    expect(stats.pagados).toBe(1);
    expect(stats.totalIngresos).toBe(0);
  });
});
