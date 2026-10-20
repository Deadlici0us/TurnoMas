import { describe, expect, it } from "vitest";

import { PLANTILLAS_AMIGABLES } from "@/lib/config/etiquetas";
import { resolverPlantilla, textoWhatsapp } from "@/lib/notifications/custom-templates";

const DATOS = {
  cliente: "Juan Pérez",
  negocio: "Barbería Diego",
  servicio: "Corte clásico",
  profesional: "Diego",
  fecha: "21/10/2026 09:30",
};

const ENLACES = {
  cancelacion: "https://app.turnomas.com/cancelar/t-1?token=abc",
  pago: "https://mp.turnomas.com/pagar/t-1",
  resena: "https://search.google.com/local/writereview?placeid=ChIJ1",
  opinionPrivada: "https://app.turnomas.com/resena/t-1",
  reserva: "https://app.turnomas.com/ar/barberia-diego",
};

function interpolar(texto: string): string
{
  const variables: Record<string, string> = {
    ...DATOS,
    link_cancelacion: ENLACES.cancelacion,
    link_pago: ENLACES.pago,
    link_resena: ENLACES.resena,
    link_reserva: ENLACES.reserva,
  };

  return texto.replace(/\{([a-zA-Z_]+)\}/g, (marca, clave: string) => variables[clave] ?? marca);
}

function textoVisible(html: string): string
{
  return html.replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"");
}

function lineas(cuerpo: string): string[]
{
  return cuerpo.split("\n").map((linea) => linea.trim()).filter((linea) => linea.length > 0);
}

describe("defaults de mensajes",
() =>
{
  it("debería enviar exactamente el ejemplo grisado de cada canal y variante",
  () =>
  {
    for (const plantilla of PLANTILLAS_AMIGABLES)
    {
      for (const ejemplo of plantilla.ejemplos)
      {
        if (ejemplo.canal === "email")
        {
          const email = resolverPlantilla(
            plantilla.tipo,
            { subject: null, cuerpo: null },
            DATOS,
            ENLACES,
            { varianteConfirmacion: ejemplo.variante },
          );
          const visible = textoVisible(email.html);

          expect(email.subject).toBe(interpolar(ejemplo.subject ?? ""));

          for (const linea of lineas(ejemplo.cuerpo))
          {
            expect(visible).toContain(interpolar(linea));
          }

          continue;
        }

        const whatsapp = textoWhatsapp(plantilla.tipo, { subject: null, cuerpo: null }, DATOS, ENLACES);

        for (const linea of lineas(ejemplo.cuerpo))
        {
          expect(whatsapp).toContain(interpolar(linea));
        }
      }
    }
  });

  it("debería omitir las líneas cuyos links no están configurados", () =>
  {
    const confirmacion = resolverPlantilla(
      "confirmacion",
      { subject: null, cuerpo: null },
      DATOS,
      {},
      { varianteConfirmacion: "sin_sena" },
    );

    expect(textoVisible(confirmacion.html)).not.toContain("{link_cancelacion}");
    expect(textoVisible(confirmacion.html)).not.toContain("cancelá acá:");
  });
});
