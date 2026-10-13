import { describe, expect, it } from "vitest";

import { resolverBaseHorarioNegocio, weekdayDeDiaCivil } from "./horario-rango";

describe("horario-rango",
() =>
{
  it("debería resolver el weekday civil sin depender de la zona del server",
  () =>
  {
    expect(weekdayDeDiaCivil({ anio: 2026, mes: 5, dia: 11 })).toBe(1);
    expect(weekdayDeDiaCivil({ anio: 2026, mes: 5, dia: 12 })).toBe(2);
    expect(weekdayDeDiaCivil({ anio: 2026, mes: 5, dia: 17 })).toBe(0);
  });

  it("debería usar apertura y cierre del negocio ese día",
  () =>
  {
    const base = resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 12 }], { mar: ["09:00-19:00"] });

    expect(base).toEqual({ horaDesde: 9, horaHasta: 19, hayHorario: true });
  });

  it("debería colapsar franjas múltiples en min-max continuo",
  () =>
  {
    const base = resolverBaseHorarioNegocio(
      [{ anio: 2026, mes: 5, dia: 12 }],
      { mar: ["09:00-13:00", "15:00-20:00"] },
    );

    expect(base).toEqual({ horaDesde: 9, horaHasta: 20, hayHorario: true });
  });

  it("debería redondear apertura hacia abajo y cierre hacia arriba",
  () =>
  {
    const base = resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 12 }], { mar: ["08:30-22:15"] });

    expect(base).toEqual({ horaDesde: 8, horaHasta: 23, hayHorario: true });
  });

  it("debería leer el formato legacy lun-vie",
  () =>
  {
    const base = resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 12 }], { "lun-vie": "09:00-19:00" });

    expect(base).toEqual({ horaDesde: 9, horaHasta: 19, hayHorario: true });
  });

  it("debería devolver rango mínimo 4h cuando el día está cerrado",
  () =>
  {
    const base = resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 17 }], { dom: [] });

    expect(base).toEqual({ horaDesde: 8, horaHasta: 12, hayHorario: false });
  });

  it("debería devolver rango mínimo 4h sin horario configurado o inválido",
  () =>
  {
    expect(resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 12 }], {}))
      .toEqual({ horaDesde: 8, horaHasta: 12, hayHorario: false });
    expect(resolverBaseHorarioNegocio([{ anio: 2026, mes: 5, dia: 12 }], { mar: ["mal"] }))
      .toEqual({ horaDesde: 8, horaHasta: 12, hayHorario: false });
  });

  it("debería cubrir la semana con el min-max de los días abiertos",
  () =>
  {
    const semana = [
      { anio: 2026, mes: 5, dia: 11 },
      { anio: 2026, mes: 5, dia: 12 },
      { anio: 2026, mes: 5, dia: 13 },
      { anio: 2026, mes: 5, dia: 14 },
      { anio: 2026, mes: 5, dia: 15 },
      { anio: 2026, mes: 5, dia: 16 },
      { anio: 2026, mes: 5, dia: 17 },
    ];
    const base = resolverBaseHorarioNegocio(semana, { lun: ["08:00-22:00"], sáb: ["10:00-14:00"] });

    expect(base).toEqual({ horaDesde: 8, horaHasta: 22, hayHorario: true });
  });

  it("debería devolver 4h si toda la semana está cerrada",
  () =>
  {
    const semana = [
      { anio: 2026, mes: 5, dia: 11 },
      { anio: 2026, mes: 5, dia: 12 },
      { anio: 2026, mes: 5, dia: 13 },
      { anio: 2026, mes: 5, dia: 14 },
      { anio: 2026, mes: 5, dia: 15 },
      { anio: 2026, mes: 5, dia: 16 },
      { anio: 2026, mes: 5, dia: 17 },
    ];

    expect(resolverBaseHorarioNegocio(semana, {})).toEqual({ horaDesde: 8, horaHasta: 12, hayHorario: false });
  });
});
