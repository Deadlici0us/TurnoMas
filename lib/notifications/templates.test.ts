import { describe, expect, it } from "vitest";

import
{
  plantillaConfirmacion,
  plantillaRecordatorio,
  plantillaRemarketing,
  plantillaResena,
} from "./templates";

const base = {
  negocio: "Barbería Diego",
  servicio: "Corte clásico",
  profesional: "Diego",
  fecha: "28/09/2026 10:00",
};

describe("plantillaConfirmacion",
() =>
{
  it("debería incluir negocio, servicio y link de Google Calendar en español",
  () =>
  {
    const t = plantillaConfirmacion({ ...base, gcalUrl: "https://gcal/x" });

    expect(t.subject).toContain("Barbería Diego");
    expect(t.html).toContain("Corte clásico");
    expect(t.html).toContain("Diego");
    expect(t.html).toContain("https://gcal/x");
    expect(t.html).not.toMatch(/[A-Za-z]*your[A-Za-z]*/i);
  });
});

describe("plantillaRecordatorio",
() =>
{
  it("debería recordar fecha y profesional con tono voseo",
  () =>
  {
    const t = plantillaRecordatorio(base);

    expect(t.subject).toContain("mañana");
    expect(t.html.toLowerCase()).toContain("te esperamos");
    expect(t.html).toContain("28/09/2026 10:00");
  });
});

describe("plantillaRemarketing",
() =>
{
  it("debería invitar a renovar el servicio",
  () =>
  {
    const t = plantillaRemarketing({ ...base, portalUrl: "/ar/barberia-diego" });

    expect(t.subject).toContain("Corte clásico");
    expect(t.html).toContain("/ar/barberia-diego");
    expect(t.html).toContain("renovar");
  });
});

describe("plantillaResena",
() =>
{
  it("debería pedir calificación con link de respuesta",
  () =>
  {
    const t = plantillaResena({ ...base, resenaUrl: "https://app/resena/123" });

    expect(t.subject).toContain("opinión");
    expect(t.html).toContain("https://app/resena/123");
  });
});
