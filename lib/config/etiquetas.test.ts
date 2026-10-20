import { describe, expect, it } from "vitest";

import
{
  ejemploFaltas,
  ejemploSena,
  etiquetaPenalidad,
  etiquetaZonaHoraria,
  PLANTILLAS_AMIGABLES,
  ZONAS_AMIGABLES,
} from "./etiquetas";

describe("etiquetas amigables de configuración",
() =>
{
  it("debería traducir zonas IANA a ciudad y país",
  () =>
  {
    expect(etiquetaZonaHoraria("America/Argentina/Buenos_Aires")).toBe("Buenos Aires, Argentina");
    expect(etiquetaZonaHoraria("America/Mexico_City")).toBe("Ciudad de México, México");
    expect(etiquetaZonaHoraria("Europe/Madrid")).toBe("Madrid, España");
  });

  it("debería devolver la zona cruda si no tiene etiqueta",
  () =>
  {
    expect(etiquetaZonaHoraria("America/No_Existe")).toBe("America/No_Existe");
  });

  it("debería cubrir todas las zonas soportadas",
  () =>
  {
    for (const zona of Object.keys(ZONAS_AMIGABLES))
    {
      expect(etiquetaZonaHoraria(zona).length).toBeGreaterThan(0);
      expect(etiquetaZonaHoraria(zona)).not.toContain("/");
    }
  });

  it("debería explicar la penalidad sin tecnicismos",
  () =>
  {
    expect(etiquetaPenalidad("blocked")).toBe("No dejar reservar más");
    expect(etiquetaPenalidad("fullDeposit")).toBe("Pedir seña completa");
  });

  it("debería armar el ejemplo de faltas en lenguaje simple",
  () =>
  {
    expect(ejemploFaltas(2, "blocked")).toBe(
      "Si un cliente falta 2 veces, no lo dejamos reservar más.");
    expect(ejemploFaltas(1, "fullDeposit")).toBe(
      "Si un cliente falta 1 vez, le pedimos seña completa para reservar.");
    expect(ejemploFaltas(3, "blocked")).toContain("3 veces");
  });

  it("debería armar el ejemplo de seña con horas simples",
  () =>
  {
    expect(ejemploSena(72)).toBe(
      "Si cancela faltando más de 72 hs, le devolvemos la seña. Si cancela con menos tiempo, la pierde.");
    expect(ejemploSena(24)).toContain("24 hs");
  });

  it("debería describir las 4 plantillas sin tecnicismos internos",
  () =>
  {
    expect(PLANTILLAS_AMIGABLES).toHaveLength(4);

    const titulos = PLANTILLAS_AMIGABLES.map((p) => p.titulo).join(" ");

    expect(titulos).not.toMatch(/subject/i);

    for (const plantilla of PLANTILLAS_AMIGABLES)
    {
      expect(plantilla.titulo.length).toBeGreaterThan(0);
      expect(plantilla.ayuda.length).toBeGreaterThan(0);
      expect(plantilla.variables).toContain("cliente");
      expect(plantilla.ejemploCuerpo).toContain("{cliente}");
      expect(plantilla.ejemplos.length).toBeGreaterThan(0);

      if (plantilla.usaSubject)
      {
        expect(plantilla.ejemploSubject.length).toBeGreaterThan(0);
      }
      else
      {
        expect(plantilla.ejemploSubject).toBe("");
      }
    }
  });

  it("debería mostrar las variantes y canales que realmente se envían",
  () =>
  {
    const confirmacion = PLANTILLAS_AMIGABLES.find((p) => p.tipo === "confirmacion");
    const recordatorio = PLANTILLAS_AMIGABLES.find((p) => p.tipo === "recordatorio");
    const resena = PLANTILLAS_AMIGABLES.find((p) => p.tipo === "resena");
    const remarketing = PLANTILLAS_AMIGABLES.find((p) => p.tipo === "remarketing");

    expect(confirmacion?.ejemplos.map((e) => e.variante)).toEqual(["sin_sena", "con_sena"]);
    expect(confirmacion?.ejemplos.every((e) => e.canal === "email")).toBe(true);
    expect(confirmacion?.ejemplos[1]?.subject).toContain("casi lista");

    expect(recordatorio?.ejemplos.map((e) => e.canal)).toEqual(["email", "whatsapp"]);
    expect(resena?.ejemplos.map((e) => e.canal)).toEqual(["email", "whatsapp"]);
    expect(remarketing?.usaSubject).toBe(false);
    expect(remarketing?.ejemplos.map((e) => e.canal)).toEqual(["whatsapp"]);
  });

  it("debería usar el texto default como ejemplo grisado",
  () =>
  {
    const recordatorio = PLANTILLAS_AMIGABLES.find((p) => p.tipo === "recordatorio");

    expect(recordatorio?.ejemploCuerpo).toContain("Hola {cliente}, te esperamos mañana {fecha}");
    expect(recordatorio?.ejemploCuerpo).toContain("{link_cancelacion}");
    expect(recordatorio?.ejemploSubject).toBe("Recordatorio: tu turno en {negocio} es mañana");
  });
});
