import { describe, expect, it } from "vitest";

import
{
  plantillaCancelacion,
  plantillaConfirmacion,
  plantillaRecordatorio,
  plantillaRemarketing,
  plantillaResena,
} from "./templates";

const base = {
  cliente: "Juan Pérez",
  negocio: "Barbería Diego",
  servicio: "Corte clásico",
  profesional: "Diego",
  fecha: "28/09/2026 10:00",
};

describe("plantillaConfirmacion",
() =>
{
  it("debería incluir negocio y servicio en español sin links de calendario",
  () =>
  {
    const t = plantillaConfirmacion(base);

    expect(t.subject).toContain("Barbería Diego");
    expect(t.html).toContain("Corte clásico");
    expect(t.html).toContain("Diego");
    expect(t.html).not.toContain("Google Calendar");
    expect(t.html).not.toContain(".ics");
    expect(t.html).not.toMatch(/[A-Za-z]*your[A-Za-z]*/i);
    expect(t.html).toContain("Hola Juan Pérez");
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
    expect(t.html).toContain("Hola Juan Pérez");
  });

  it("debería incluir el link de cancelación cuando está disponible",
  () =>
  {
    const t = plantillaRecordatorio({ ...base, cancelacionUrl: "https://app/cancelar/t-1?token=abc" });

    expect(t.html).toContain("https://app/cancelar/t-1?token=abc");
    expect(t.html.toLowerCase()).toContain("cancelá tu turno acá");
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
  it("debería invitar a Google (para todos) y ofrecer feedback privado",
  () =>
  {
    const t = plantillaResena({
      ...base,
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ1",
      feedbackUrl: "https://app/resena/123",
    });

    expect(t.subject).toContain("opinión");
    expect(t.html).toContain("https://search.google.com/local/writereview?placeid=ChIJ1");
    expect(t.html).toContain("https://app/resena/123");
  });

  it("debería omitir el botón de Google si no hay link",
  () =>
  {
    const t = plantillaResena({ ...base, googleReviewUrl: "", feedbackUrl: "https://app/resena/9" });

    expect(t.html).not.toContain("writereview");
    expect(t.html).toContain("https://app/resena/9");
  });
});

describe("layout compartido",() =>
{
  it("debería usar el mismo shell de marca y el logo del negocio en todos los emails",
  () =>
  {
    const logoUrl = "https://cdn.turnomas.com/logos/barberia.jpg";
    const emails = [
      plantillaConfirmacion({ ...base, logoUrl }),
      plantillaRecordatorio({ ...base, logoUrl, cancelacionUrl: "https://app/cancelar/t-1" }),
      plantillaRemarketing({ ...base, logoUrl, portalUrl: "https://app/ar/barberia" }),
      plantillaResena({
        ...base,
        logoUrl,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJ1",
        feedbackUrl: "https://app/resena/1",
      }),
      plantillaCancelacion({
        ...base,
        logoUrl,
        cancelacionUrl: "https://app/cancelar/t-1",
        seDevuelve: true,
        retencionHs: 72,
      }),
    ];

    for (const email of emails)
    {
      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("max-width:600px");
      expect(email.html).toContain(logoUrl);
      expect(email.html).toContain("Enviado por TurnoMas");
      expect(email.html).toContain("background-color:#0b3052");
    }
  });
});

describe("plantillaCancelacion",
() =>
{
  it("debería confirmar la devolución de la seña",
  () =>
  {
    const t = plantillaCancelacion({
      ...base, cancelacionUrl: "https://app/cancelar/t-1", seDevuelve: true, retencionHs: 72,
    });

    expect(t.subject).toContain("Cancelaste");
    expect(t.html).toContain("Corte clásico");
    expect(t.html).toContain("vuelve a tu cuenta");
    expect(t.html).toContain("https://app/cancelar/t-1");
  });

  it("debería avisar la retención dentro de la ventana",
  () =>
  {
    const t = plantillaCancelacion({
      ...base, cancelacionUrl: "https://app/cancelar/t-1", seDevuelve: false, retencionHs: 72,
    });

    expect(t.html).toContain("72hs");
    expect(t.html).toContain("retenida");
  });
});
