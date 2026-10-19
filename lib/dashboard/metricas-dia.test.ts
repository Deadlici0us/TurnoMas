import { describe, expect, it } from "vitest";

import { buscarProximoTurnoDeHoy, calcularMetricasDelDia } from "./metricas-dia";

const ZONA_AR = "America/Argentina/Buenos_Aires";

describe("calcularMetricasDelDia",
() =>
{
  it("debería contar solo los turnos del día civil del negocio",
  () =>
  {
    const ahora = new Date("2026-10-19T12:00:00.000Z");
    const turnos = [
      { inicio: "2026-10-19T13:00:00.000Z", estado: "pendiente", sena_monto: null },
      { inicio: "2026-10-19T02:00:00.000Z", estado: "confirmado", sena_monto: null },
      { inicio: "2026-10-20T02:00:00.000Z", estado: "pagado", sena_monto: 5000 },
      { inicio: "2026-10-20T13:00:00.000Z", estado: "pagado", sena_monto: 7000 },
    ];

    expect(calcularMetricasDelDia(turnos, ZONA_AR, ahora)).toEqual({
      turnosHoy: 2,
      pendientesHoy: 1,
      confirmadosHoy: 0,
      ingresosHoy: 5000,
    });
  });

  it("debería respetar el huso horario del negocio",
  () =>
  {
    const ahora = new Date("2026-10-19T20:00:00.000Z");
    const turnos = [{ inicio: "2026-10-20T05:00:00.000Z", estado: "confirmado" }];

    expect(calcularMetricasDelDia(turnos, ZONA_AR, ahora).turnosHoy).toBe(0);
    expect(calcularMetricasDelDia(turnos, "America/Tijuana", ahora).turnosHoy).toBe(1);
  });

  it("debería ignorar fechas inválidas y montos no numéricos",
  () =>
  {
    const ahora = new Date("2026-10-19T12:00:00.000Z");
    const turnos = [
      { inicio: "no-fecha", estado: "pagado", sena_monto: 5000 },
      { inicio: "2026-10-19T13:00:00.000Z", estado: "pagado", sena_monto: null },
      { inicio: "2026-10-19T14:00:00.000Z", estado: "pagado", sena_monto: 2500 },
    ];

    expect(calcularMetricasDelDia(turnos, ZONA_AR, ahora)).toEqual({
      turnosHoy: 2,
      pendientesHoy: 0,
      confirmadosHoy: 0,
      ingresosHoy: 2500,
    });
  });
});

describe("buscarProximoTurnoDeHoy",
() =>
{
  it("debería devolver el próximo turno de hoy sin cancelados ni pasados",
  () =>
  {
    const ahora = new Date("2026-10-19T15:00:00.000Z");
    const pasado = { id: "pasado", inicio: "2026-10-19T14:00:00.000Z", estado: "confirmado" };
    const cancelado = { id: "cancelado", inicio: "2026-10-19T16:00:00.000Z", estado: "cancelado" };
    const proximo = { id: "proximo", inicio: "2026-10-19T17:00:00.000Z", estado: "confirmado" };
    const posterior = { id: "posterior", inicio: "2026-10-19T18:00:00.000Z", estado: "confirmado" };
    const manana = { id: "manana", inicio: "2026-10-20T17:00:00.000Z", estado: "confirmado" };

    const resultado = buscarProximoTurnoDeHoy(
      [posterior, manana, cancelado, proximo, pasado],
      ZONA_AR,
      ahora,
    );

    expect(resultado).toBe(proximo);
  });

  it("debería devolver null sin turnos pendientes para hoy",
  () =>
  {
    const ahora = new Date("2026-10-19T20:00:00.000Z");
    const turnos = [
      { id: "pasado", inicio: "2026-10-19T14:00:00.000Z", estado: "confirmado" },
      { id: "manana", inicio: "2026-10-20T14:00:00.000Z", estado: "confirmado" },
    ];

    expect(buscarProximoTurnoDeHoy(turnos, ZONA_AR, ahora)).toBeNull();
  });
});
