import { describe, expect, it } from "vitest";

import { construirICS, construirLinkGoogleCalendar } from "./ics";

const INICIO = new Date("2026-10-05T14:00:00.000Z");
const FIN = new Date("2026-10-05T14:45:00.000Z");

describe("construirICS",
() =>
{
  it("debería generar un VCALENDAR con el evento en español",
  () =>
  {
    const ics = construirICS({ titulo: "Corte clásico en Barbería Diego", inicio: INICIO, fin: FIN });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261005T140000Z");
    expect(ics).toContain("DTEND:20261005T144500Z");
    expect(ics).toContain("SUMMARY:Corte clásico en Barbería Diego");
    expect(ics).toContain("END:VEVENT");
  });

  it("debería escapar comas y saltos de línea",
  () =>
  {
    const ics = construirICS({ titulo: "Turno", inicio: INICIO, fin: FIN, descripcion: "Hola,\nchau" });

    expect(ics).toContain("DESCRIPTION:Hola\\,\\nchau");
  });

  it("debería rechazar fin anterior al inicio",
  () =>
  {
    expect(() => construirICS({ titulo: "Turno", inicio: FIN, fin: INICIO }))
      .toThrow("El fin del turno debe ser posterior al inicio.");
  });
});

describe("construirLinkGoogleCalendar",
() =>
{
  it("debería generar el link de plantilla con fechas UTC",
  () =>
  {
    const url = construirLinkGoogleCalendar({ titulo: "Corte", inicio: INICIO, fin: FIN });

    expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
    expect(url).toContain("dates=20261005T140000Z%2F20261005T144500Z");
    expect(url).toContain("text=Corte");
  });
});
