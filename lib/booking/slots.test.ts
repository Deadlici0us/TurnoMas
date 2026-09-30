import { describe, expect, it } from "vitest";

import
{
  buildAvailableSlots,
  buildDaySlots,
  filterAvailableSlots,
} from "./slots";

function day2026(): Date
{
  return new Date(2026, 8, 28, 0, 0, 0, 0);
}

describe("buildDaySlots",
() =>
{
  it("debería generar inicios cada 30 minutos sin exceder el cierre",
  () =>
  {
    const starts = buildDaySlots(day2026(), 540, 600, 30, 30);

    expect(starts.map((d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`))
      .toEqual(["9:00", "9:30"]);
  });

  it("debería excluir el último inicio si el servicio excede el cierre",
  () =>
  {
    const starts = buildDaySlots(day2026(), 540, 600, 45, 30);

    expect(starts).toHaveLength(1);
    expect(starts[0]?.getHours()).toBe(9);
    expect(starts[0]?.getMinutes()).toBe(0);
  });

  it("debería devolver vacío si el servicio no cabe en la jornada",
  () =>
  {
    expect(buildDaySlots(day2026(), 540, 560, 30, 30)).toHaveLength(0);
  });
});

describe("filterAvailableSlots",
() =>
{
  it("debería excluir los inicios que solapan bloqueos existentes",
  () =>
  {
    const day = day2026();
    const candidates = buildDaySlots(day, 540, 660, 30, 30);
    const blocked = [{ start: new Date(2026, 8, 28, 9, 0), end: new Date(2026, 8, 28, 9, 30) }];

    const result = filterAvailableSlots(candidates, 30, blocked);

    expect(result.map((d) => d.getMinutes())).toEqual([30, 0, 30]);
    expect(result.map((d) => d.getHours())).toEqual([9, 10, 10]);
  });
});

describe("buildAvailableSlots",
() =>
{
  it("debería armar 7 días salteando los días sin horario",
  () =>
  {
    const horarios = {
      lun: ["09:00-10:00"],
      mar: ["09:00-10:00"],
      mié: ["09:00-10:00"],
      jue: ["09:00-10:00"],
      vie: ["09:00-10:00"],
      sáb: ["09:00-10:00"],
    };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);

    const week = buildAvailableSlots(horarios, [], 30, monday, 7, 30);

    expect(week).toHaveLength(6);
    expect(week.every((d) => d.starts.length === 2)).toBe(true);
  });

  it("debería descontar los turnos existentes del profesional",
  () =>
  {
    const horarios = { lun: ["09:00-11:00"] };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);
    const turnos = [
      { staffId: "diego", inicio: new Date(2026, 8, 28, 9, 0).toISOString(), duracionMin: 30 },
      { staffId: "otro", inicio: new Date(2026, 8, 28, 9, 0).toISOString(), duracionMin: 30 },
    ];

    const week = buildAvailableSlots(horarios, turnos, 30, monday, 1, 30, "diego");

    expect(week).toHaveLength(1);
    expect(week[0]?.starts.map((d) => d.getMinutes())).toEqual([30, 0, 30]);
  });

  it("debería respetar el descanso del mediodía en jornada cortada",
  () =>
  {
    const horarios = { lun: ["09:00-13:00", "15:00-20:00"] };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);

    const week = buildAvailableSlots(horarios, [], 30, monday, 1, 30);

    expect(week).toHaveLength(1);

    const horas = (week[0]?.starts ?? []).map((d) => d.getHours() + d.getMinutes() / 60);

    expect(Math.min(...horas)).toBe(9);
    expect(Math.max(...horas)).toBe(19.5);
    expect(horas.some((h) => h >= 13 && h < 15)).toBe(false);
  });

  it("debería leer horarios legacy lun-vie",
  () =>
  {
    const horarios = { "lun-vie": "09:00-10:00" };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);

    const week = buildAvailableSlots(horarios, [], 30, monday, 1, 30);

    expect(week).toHaveLength(1);
    expect(week[0]?.starts).toHaveLength(2);
  });
});
