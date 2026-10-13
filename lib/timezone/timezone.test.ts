import { describe, expect, it } from "vitest";

import
{
  claveDiaEnZona,
  DEFAULT_TIMEZONE,
  formatearEnZona,
  formatearEnZonaConFecha,
  formatearEnZonaConSegundos,
  minutosEnZona,
  resolverTimezoneNegocio,
  validarTimezone,
} from "@/lib/timezone/timezone";

describe("timezone por negocio",
() =>
{
  it("debería validar zonas IANA y rechazar inválidas",
  () =>
  {
    expect(validarTimezone("America/Argentina/Buenos_Aires")).toBe("America/Argentina/Buenos_Aires");
    expect(validarTimezone("America/Cancun")).toBe("America/Cancun");
    expect(() => validarTimezone("no-existe")).toThrow(RangeError);
    expect(() => validarTimezone("")).toThrow(RangeError);
    expect(() => validarTimezone(null)).toThrow(RangeError);
  });

  it("debería resolver por timezone explícito antes que por país",
  () =>
  {
    expect(resolverTimezoneNegocio({ timezone: "America/Tijuana", pais: "mx" })).toBe("America/Tijuana");
    expect(resolverTimezoneNegocio({ timezone: null, pais: "ar" })).toBe("America/Argentina/Buenos_Aires");
    expect(resolverTimezoneNegocio({ timezone: "invalida", pais: "mx" })).toBe("America/Mexico_City");
    expect(resolverTimezoneNegocio({})).toBe(DEFAULT_TIMEZONE);
  });

  it("debería formatear el mismo instante distinto según la zona (lista vs grilla)",
  () =>
  {
    // 2026-09-30T17:00:00Z = 14:00 en Buenos Aires (UTC-3), 11:00 en Tijuana (UTC-7 en verano).
    const fecha = new Date("2026-09-30T17:00:00.000Z");

    expect(formatearEnZona(fecha, "America/Argentina/Buenos_Aires")).toBe("30/09 14:00");
    expect(formatearEnZona(fecha, "America/Tijuana")).toBe("30/09 10:00");
    expect(minutosEnZona(fecha, "America/Argentina/Buenos_Aires")).toBe(14 * 60);
    expect(claveDiaEnZona(fecha, "America/Argentina/Buenos_Aires")).toBe("2026-09-30");
  });

  it("debería distinguir husos dentro del mismo país",
  () =>
  {
    // 2026-01-15T05:30:00Z = 14/01 21:30 en Tijuana (UTC-8), 15/01 00:30 en Cancún (UTC-5).
    const fecha = new Date("2026-01-15T05:30:00.000Z");

    expect(claveDiaEnZona(fecha, "America/Tijuana")).toBe("2026-01-14");
    expect(claveDiaEnZona(fecha, "America/Cancun")).toBe("2026-01-15");
    expect(formatearEnZona(fecha, "America/Tijuana")).toBe("14/01 21:30");
    expect(formatearEnZona(fecha, "America/Cancun")).toBe("15/01 00:30");
  });

  it("debería aceptar ISO string y fechas inválidas controladas",
  () =>
  {
    expect(formatearEnZona("2026-09-30T17:00:00.000Z", "America/Argentina/Buenos_Aires")).toBe("30/09 14:00");
    expect(formatearEnZona("no-fecha", "America/Argentina/Buenos_Aires")).toBe("no-fecha");
  });

  it("debería formatear inicio con fecha completa y precisión de minutos",
  () =>
  {
    expect(formatearEnZonaConFecha("2026-10-05T14:07:00.000Z", "America/Argentina/Buenos_Aires"))
      .toBe("05/10/2026 11:07");
    expect(formatearEnZonaConFecha(new Date("2026-01-15T05:30:00.000Z"), "America/Cancun"))
      .toBe("15/01/2026 00:30");
    expect(formatearEnZonaConFecha("no-fecha", "America/Argentina/Buenos_Aires")).toBe("no-fecha");
  });

  it("debería formatear pago de seña con precisión de segundos",
  () =>
  {
    expect(formatearEnZonaConSegundos("2026-10-05T14:07:09.000Z", "America/Argentina/Buenos_Aires"))
      .toBe("05/10/2026 11:07:09");
    expect(formatearEnZonaConSegundos(new Date("2026-01-15T05:30:45.000Z"), "America/Cancun"))
      .toBe("15/01/2026 00:30:45");
    expect(formatearEnZonaConSegundos("no-fecha", "America/Argentina/Buenos_Aires")).toBe("no-fecha");
  });
});
