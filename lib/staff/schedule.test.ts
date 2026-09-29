import { describe, expect, it } from "vitest";

import
{
  dayKeyForWeekday,
  formatDayRange,
  lookupDayRange,
  parseDayRange,
} from "./schedule";

describe("parseDayRange",
() =>
{
  it("debería parsear un rango válido HH:MM-HH:MM a minutos",
  () =>
  {
    expect(parseDayRange("09:00-19:00")).toEqual({ openMinutes: 540, closeMinutes: 1140 });
  });

  it("debería rechazar un cierre anterior o igual a la apertura",
  () =>
  {
    expect(() => parseDayRange("19:00-09:00")).toThrow(RangeError);
    expect(() => parseDayRange("09:00-09:00")).toThrow(RangeError);
  });

  it("debería rechazar formatos inválidos",
  () =>
  {
    expect(() => parseDayRange("9:00-19:00")).toThrow(RangeError);
    expect(() => parseDayRange("09:00")).toThrow(RangeError);
    expect(() => parseDayRange("")).toThrow(RangeError);
    expect(() => parseDayRange("24:00-25:00")).toThrow(RangeError);
  });
});

describe("formatDayRange",
() =>
{
  it("debería redondear el parseo (ida y vuelta)",
  () =>
  {
    expect(formatDayRange({ openMinutes: 540, closeMinutes: 1140 })).toBe("09:00-19:00");
    expect(formatDayRange(parseDayRange("10:30-20:00"))).toBe("10:30-20:00");
  });
});

describe("dayKeyForWeekday",
() =>
{
  it("debería mapear domingo y sábado a sus claves",
  () =>
  {
    expect(dayKeyForWeekday(0)).toBe("dom");
    expect(dayKeyForWeekday(6)).toBe("sab");
  });

  it("debería mapear lunes a viernes a lun-vie",
  () =>
  {
    for (const weekday of [1, 2, 3, 4, 5])
    {
      expect(dayKeyForWeekday(weekday)).toBe("lun-vie");
    }
  });
});

describe("lookupDayRange",
() =>
{
  const horarios = { "lun-vie": "09:00-19:00", sab: "09:00-14:00" };

  it("debería resolver el rango del día según horarios del profesional",
  () =>
  {
    expect(lookupDayRange(horarios, 3)).toEqual({ openMinutes: 540, closeMinutes: 1140 });
    expect(lookupDayRange(horarios, 6)).toEqual({ openMinutes: 540, closeMinutes: 840 });
  });

  it("debería devolver null cuando el profesional no trabaja ese día",
  () =>
  {
    expect(lookupDayRange(horarios, 0)).toBeNull();
    expect(lookupDayRange({}, 3)).toBeNull();
  });
});
