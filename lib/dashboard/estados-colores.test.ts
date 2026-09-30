import { describe, expect, it } from "vitest";

import { claseBadgePara, claseGrillaPara, EXTERNO_LEYENDA, LEYENDA_ESTADOS } from "./estados-colores";

describe("estados-colores",
() =>
{
  it("debería exponer los 6 estados en la leyenda",
  () =>
  {
    const estados = LEYENDA_ESTADOS.map((item) => item.estado).sort();

    expect(estados).toEqual(["ausente", "cancelado", "completado", "confirmado", "pagado", "pendiente"]);
  });

  it("debería describir cada estado en español",
  () =>
  {
    for (const item of LEYENDA_ESTADOS)
    {
      expect(item.titulo.length).toBeGreaterThan(0);
      expect(item.descripcion.length).toBeGreaterThan(0);
    }

    expect(EXTERNO_LEYENDA.titulo.length).toBeGreaterThan(0);
  });

  it("debería devolver clases conocidas y un fallback para estados raros",
  () =>
  {
    expect(claseBadgePara("pagado")).toContain("bg-green-100");
    expect(claseGrillaPara("pendiente")).toContain("bg-amber-200");
    expect(claseBadgePara("inexistente")).toBe(claseBadgePara("cancelado"));
    expect(claseGrillaPara("inexistente")).toBe(claseGrillaPara("cancelado"));
  });
});
