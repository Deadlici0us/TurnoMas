import { describe, expect, it } from "vitest";

import { linkRemarketingWhatsapp } from "@/lib/remarketing/link";

const BASE = {
  whatsapp: "+549110000001",
  clienteNombre: "Juan Pérez",
  portalUrl: "https://app.turnomas.com/ar/barberia",
  negocioNombre: "Barbería Diego",
  msg_remarketing_subject: null,
  msg_remarketing_cuerpo: null,
  servicioNombre: "Corte clásico",
};

describe("linkRemarketingWhatsapp",
() =>
{
  it("debería usar la plantilla default con cliente y link de reserva",
  () =>
  {
    const link = linkRemarketingWhatsapp(BASE);

    expect(link).toContain("wa.me/549110000001");
    expect(decodeURIComponent(link as string)).toContain("Hola Juan Pérez");
    expect(decodeURIComponent(link as string)).toContain("https://app.turnomas.com/ar/barberia");
  });

  it("debería respetar el cuerpo personalizado",
  () =>
  {
    const link = linkRemarketingWhatsapp({
      ...BASE,
      msg_remarketing_cuerpo: "Hola {cliente}, volvé a {negocio}: {link_reserva}",
    });

    const texto = decodeURIComponent(link as string);

    expect(texto).toContain("Hola Juan Pérez, volvé a Barbería Diego");
    expect(texto).toContain("https://app.turnomas.com/ar/barberia");
  });

  it("debería devolver null sin portal",  () =>
  {
    expect(linkRemarketingWhatsapp({ ...BASE, portalUrl: null })).toBeNull();
  });
});
