import { describe, expect, it } from "vitest";

import
{
  interpolarVariables,
  normalizarTextoPlantilla,
  resolverPlantilla,
  textoWhatsapp,
  validarGoogleMapsUrl,
  VARIABLES_PLANTILLA,
} from "./custom-templates";
import { linkWhatsapp, normalizarWhatsappParaLink } from "./whatsapp";

const DATOS = {
  negocio: "Barbería Diego",
  servicio: "Corte clásico",
  profesional: "Diego",
  fecha: "28/09/2026 10:00",
};

describe("interpolarVariables",
() =>
{
  it("debería reemplazar variables conocidas y dejar intactas las demás",
  () =>
  {
    expect(interpolarVariables("Hola {negocio} {rara}", { negocio: "X" })).toBe("Hola X {rara}");
  });
});

describe("normalizarTextoPlantilla",
() =>
{
  it("debería devolver null ante texto vacío o no texto",
  () =>
  {
    expect(normalizarTextoPlantilla("   ", 120)).toBe(null);
    expect(normalizarTextoPlantilla(null, 120)).toBe(null);
  });
});

describe("resolverPlantilla",
() =>
{
  it("debería usar el default cuando no hay personalización",
  () =>
  {
    const t = resolverPlantilla("confirmacion", { subject: null, cuerpo: null }, DATOS);

    expect(t.subject).toContain("Barbería Diego");
    expect(t.html).toContain("Corte clásico");
  });

  it("debería interpolar subject y cuerpo personalizados con link",
  () =>
  {
    const t = resolverPlantilla("resena",
      { subject: "Opiná de {servicio}", cuerpo: "Hola, calificanos acá:\n{link}" },
      DATOS, "https://app/resena/1");

    expect(t.subject).toBe("Opiná de Corte clásico");
    expect(t.html).toContain("https://app/resena/1");
  });

  it("debería exponer las 5 variables documentadas",
  () =>
  {
    expect([...VARIABLES_PLANTILLA]).toEqual(["negocio", "servicio", "profesional", "fecha", "link"]);
  });

  it("debería armar texto plano de WhatsApp con custom o default",
  () =>
  {
    expect(textoWhatsapp("recordatorio", { subject: null, cuerpo: "Nos vemos {fecha}" }, DATOS))
      .toBe("Nos vemos 28/09/2026 10:00");
    expect(textoWhatsapp("recordatorio", { subject: null, cuerpo: null }, DATOS))
      .toContain("te esperamos");
  });
});

describe("validarGoogleMapsUrl",
() =>
{
  it("debería aceptar links de Google Maps y vacío como null",
  () =>
  {
    expect(validarGoogleMapsUrl(null)).toBe(null);
    expect(validarGoogleMapsUrl("  ")).toBe(null);
    expect(validarGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe("https://maps.app.goo.gl/abc123");
    expect(validarGoogleMapsUrl("https://www.google.com/maps/place/X")).toBe("https://www.google.com/maps/place/X");
  });

  it("debería rechazar urls que no sean de Maps",
  () =>
  {
    expect(() => validarGoogleMapsUrl("https://ejemplo.com/x")).toThrow(RangeError);
  });
});

describe("linkWhatsapp",
() =>
{
  it("debería armar wa.me con texto codificado",
  () =>
  {
    expect(linkWhatsapp("+549110000001", "Hola, te esperamos")).toBe(
      "https://wa.me/549110000001?text=Hola%2C%20te%20esperamos");
  });

  it("debería devolver null ante número inválido",
  () =>
  {
    expect(normalizarWhatsappParaLink("abc")).toBe(null);
    expect(linkWhatsapp("abc", "Hola")).toBe(null);
  });
});
