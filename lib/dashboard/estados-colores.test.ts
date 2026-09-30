import { describe, expect, it } from "vitest";

import { claseBadgePara, claseGrillaPara, etiquetaEstadoPara, ETIQUETA_ESTADO, EXTERNO_LEYENDA, LEYENDA_ESTADOS } from "./estados-colores";

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

  it("debería diferenciar completado de cancelado en badge y grilla",
  () =>
  {
    expect(claseBadgePara("completado")).not.toBe(claseBadgePara("cancelado"));
    expect(claseGrillaPara("completado")).not.toBe(claseGrillaPara("cancelado"));
    expect(claseBadgePara("completado")).toContain("bg-indigo-100");
    expect(claseGrillaPara("completado")).toContain("bg-indigo-200");
  });

  it("debería etiquetar pagado como seña y no como pago total",
  () =>
  {
    expect(ETIQUETA_ESTADO.pagado).toBe("Seña pagada");
    expect(etiquetaEstadoPara("pagado")).toBe("Seña pagada");
    expect(etiquetaEstadoPara("completado")).toBe("Completado");
    expect(etiquetaEstadoPara("inexistente")).toBe("inexistente");
  });

  it("debería aclarar en la leyenda que pagado es solo la seña",
  () =>
  {
    const pagado = LEYENDA_ESTADOS.find((item) => item.estado === "pagado");

    expect(pagado?.titulo).toBe("Seña pagada");
    expect(pagado?.descripcion.toLowerCase()).toContain("seña");
    expect(pagado?.descripcion.toLowerCase()).toContain("saldo");
  });
});
