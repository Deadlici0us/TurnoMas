import { describe, expect, it } from "vitest";

import { guiaWhatsapp } from "./guia-whatsapp";

describe("guiaWhatsapp",
() =>
{
  it("debería armar las cuatro entradas de la guía",
  () =>
  {
    const guia = guiaWhatsapp({ negocioNombre: "Barbería Diego", portalUrl: "https://turnomas.com/ar/x" });

    expect(guia.map((e) => e.clave)).toEqual(["bienvenida", "ausencia", "turno", "cancelar"]);
  });

  it("debería incluir el nombre del negocio y el link en los textos",
  () =>
  {
    const guia = guiaWhatsapp({ negocioNombre: "Barbería Diego", portalUrl: "https://turnomas.com/ar/x" });
    const bienvenida = guia.find((e) => e.clave === "bienvenida");

    expect(bienvenida?.texto).toContain("Barbería Diego");
    expect(bienvenida?.texto).toContain("https://turnomas.com/ar/x");
    expect(guia.find((e) => e.clave === "turno")?.texto).toContain("https://turnomas.com/ar/x");
  });

  it("debería usar un nombre por defecto si viene vacío",
  () =>
  {
    const guia = guiaWhatsapp({ negocioNombre: "   ", portalUrl: "/ar/x" });

    expect(guia[0]?.texto).toContain("mi negocio");
  });
});
