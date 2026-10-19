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
  cliente: "Juan Pérez",
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
    expect(normalizarTextoPlantilla("   ", 120)).toBeNull();
    expect(normalizarTextoPlantilla(null, 120)).toBeNull();
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

  it("debería interpolar subject y cuerpo personalizados con links específicos",
  () =>
  {
    const t = resolverPlantilla("resena",
      { subject: "Opiná de {servicio}", cuerpo: "Hola {cliente}, calificanos acá:\n{link_resena}" },
      DATOS, { resena: "https://app/resena/1" });

    expect(t.subject).toBe("Opiná de Corte clásico");
    expect(t.html).toContain("Hola Juan Pérez");
    expect(t.html).toContain("https://app/resena/1");
  });

  it("debería mantener {link} como alias de compatibilidad",
  () =>
  {
    const t = resolverPlantilla("remarketing",
      { subject: null, cuerpo: "Volvé acá: {link}" },
      DATOS, { reserva: "https://app/ar/barberia" });

    expect(t.html).toContain("https://app/ar/barberia");
  });

  it("debería usar el detalle por defecto cuando el cuerpo queda vacío",
  () =>
  {
    const t = resolverPlantilla("confirmacion",
      { subject: "Tu reserva en {negocio}", cuerpo: "   " },
      DATOS);

    expect(t.subject).toBe("Tu reserva en Barbería Diego");
    expect(t.html).toContain("Corte clásico con Diego · 28/09/2026 10:00");
  });

  it("debería exponer las variables comunes documentadas",
  () =>
  {
    expect([...VARIABLES_PLANTILLA]).toEqual(["cliente", "negocio", "servicio", "profesional", "fecha"]);
  });

  it("debería armar texto plano de WhatsApp con custom o default",
  () =>
  {
    expect(textoWhatsapp("recordatorio", { subject: null, cuerpo: "Hola {cliente}, nos vemos {fecha}" }, DATOS))
      .toBe("Hola Juan Pérez, nos vemos 28/09/2026 10:00");
    expect(textoWhatsapp("recordatorio", { subject: null, cuerpo: null }, DATOS))
      .toContain("Hola Juan Pérez, te esperamos");
    expect(textoWhatsapp("cancelacion", { subject: null, cuerpo: null }, DATOS,
      { cancelacion: "https://app/cancelar/1" }))
      .toContain("https://app/cancelar/1");
  });
});

describe("validarGoogleMapsUrl",
() =>
{
  it("debería aceptar links de Google Maps y vacío como null",
  () =>
  {
    expect(validarGoogleMapsUrl(null)).toBeNull();
    expect(validarGoogleMapsUrl("  ")).toBeNull();
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
    expect(normalizarWhatsappParaLink("abc")).toBeNull();
    expect(linkWhatsapp("abc", "Hola")).toBeNull();
  });
});
