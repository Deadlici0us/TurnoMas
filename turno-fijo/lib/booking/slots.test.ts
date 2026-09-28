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
    const blocked = [{ start: new Date(2026, 8, 28, 9, 0), end: new Date(2026, 8, 28, 9, 45) }];

    const result = filterAvailableSlots(candidates, 30, 15, blocked);

    expect(result.map((d) => d.getMinutes())).toEqual([0, 30]);
    expect(result.map((d) => d.getHours())).toEqual([10, 10]);
  });
});

describe("buildAvailableSlots",
() =>
{
  it("debería armar 7 días salteando los días sin horario",
  () =>
  {
    const horarios = { "lun-vie": "09:00-10:00", sab: "09:00-10:00" };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);

    const week = buildAvailableSlots(horarios, [], 30, 15, monday, 7, 30);

    expect(week).toHaveLength(6);
    expect(week.every((d) => d.starts.length === 2)).toBe(true);
  });

  it("debería descontar los turnos existentes del profesional",
  () =>
  {
    const horarios = { "lun-vie": "09:00-11:00" };
    const monday = new Date(2026, 8, 28, 8, 0, 0, 0);
    const turnos = [
      { staffId: "diego", inicio: new Date(2026, 8, 28, 9, 0).toISOString(), duracionMin: 30, bufferMin: 15 },
      { staffId: "otro", inicio: new Date(2026, 8, 28, 9, 0).toISOString(), duracionMin: 30, bufferMin: 15 },
    ];

    const week = buildAvailableSlots(horarios, turnos, 30, 15, monday, 1, 30, "diego");

    expect(week).toHaveLength(1);
    expect(week[0]?.starts.map((d) => d.getMinutes())).toEqual([0, 30]);
  });
});
