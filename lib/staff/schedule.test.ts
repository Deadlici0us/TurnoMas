import { describe, expect, it } from "vitest";

import
{
  DAY_ORDER,
  dayKeyForWeekday,
  dayLabel,
  formatDayRange,
  lookupDayRanges,
  parseDayRange,
  parseDayRanges,
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

describe("parseDayRanges",
() =>
{
  it("debería aceptar un string legacy como una sola franja",
  () =>
  {
    expect(parseDayRanges("09:00-19:00")).toEqual([{ openMinutes: 540, closeMinutes: 1140 }]);
  });

  it("debería aceptar varias franjas (jornada cortada con descanso)",
  () =>
  {
    expect(parseDayRanges(["09:00-13:00", "15:00-20:00"])).toEqual([
      { openMinutes: 540, closeMinutes: 780 },
      { openMinutes: 900, closeMinutes: 1200 },
    ]);
  });

  it("debería devolver vacío para día cerrado",
  () =>
  {
    expect(parseDayRanges([])).toEqual([]);
    expect(parseDayRanges("")).toEqual([]);
    expect(parseDayRanges(null)).toEqual([]);
    expect(parseDayRanges(undefined)).toEqual([]);
  });

  it("debería ignorar franjas vacías dentro del array",
  () =>
  {
    expect(parseDayRanges(["09:00-13:00", "  "])).toEqual([{ openMinutes: 540, closeMinutes: 780 }]);
  });

  it("debería rechazar franjas solapadas del mismo día",
  () =>
  {
    expect(() => parseDayRanges(["09:00-13:00", "12:00-20:00"])).toThrow(RangeError);
  });

  it("debería rechazar valores que no son texto ni lista",
  () =>
  {
    expect(() => parseDayRanges(42)).toThrow(RangeError);
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
  it("debería mapear cada día a su clave individual",
  () =>
  {
    expect(dayKeyForWeekday(0)).toBe("dom");
    expect(dayKeyForWeekday(1)).toBe("lun");
    expect(dayKeyForWeekday(2)).toBe("mar");
    expect(dayKeyForWeekday(3)).toBe("mié");
    expect(dayKeyForWeekday(4)).toBe("jue");
    expect(dayKeyForWeekday(5)).toBe("vie");
    expect(dayKeyForWeekday(6)).toBe("sáb");
  });

  it("debería exponer el orden canónico y las etiquetas",
  () =>
  {
    expect(DAY_ORDER).toEqual(["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]);
    expect(dayLabel("mié")).toBe("Miércoles");
    expect(dayLabel("sáb")).toBe("Sábado");
  });
});

describe("lookupDayRanges",
() =>
{
  const horarios = { lun: ["09:00-19:00"], sáb: ["09:00-14:00"] };

  it("debería resolver las franjas del día según horarios del profesional",
  () =>
  {
    expect(lookupDayRanges(horarios, 1)).toEqual([{ openMinutes: 540, closeMinutes: 1140 }]);
    expect(lookupDayRanges(horarios, 6)).toEqual([{ openMinutes: 540, closeMinutes: 840 }]);
  });

  it("debería leer el formato legacy lun-vie y sab/dom antiguos",
  () =>
  {
    const legacy = { "lun-vie": "09:00-19:00", sab: "09:00-14:00" };

    expect(lookupDayRanges(legacy, 3)).toEqual([{ openMinutes: 540, closeMinutes: 1140 }]);
    expect(lookupDayRanges(legacy, 6)).toEqual([{ openMinutes: 540, closeMinutes: 840 }]);
  });

  it("debería devolver vacío cuando el profesional no trabaja ese día",
  () =>
  {
    expect(lookupDayRanges(horarios, 0)).toEqual([]);
    expect(lookupDayRanges({}, 3)).toEqual([]);
  });
});
