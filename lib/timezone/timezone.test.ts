import { describe, expect, it } from "vitest";

import
{
  claveDiaEnZona,
  DEFAULT_TIMEZONE,
  formatearEnZona,
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
});
