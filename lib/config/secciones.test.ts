import { describe, expect, it } from "vitest";

import { normalizarSeccionConfig, SECCIONES_CONFIG } from "@/lib/config/secciones";

describe("SECCIONES_CONFIG",
() =>
{
  it("debería exponer los 6 submenús sin duplicados",
  () =>
  {
    expect(SECCIONES_CONFIG).toHaveLength(6);
    expect(new Set(SECCIONES_CONFIG.map((seccion) => seccion.id)).size).toBe(6);
  });
});

describe("normalizarSeccionConfig",
() =>
{
  it("debería aceptar secciones válidas",
  () =>
  {
    expect(normalizarSeccionConfig("mensajes")).toBe("mensajes");
    expect(normalizarSeccionConfig("cuenta")).toBe("cuenta");
  });

  it("debería caer en General por defecto",
  () =>
  {
    expect(normalizarSeccionConfig(undefined)).toBe("general");
    expect(normalizarSeccionConfig("otra")).toBe("general");
  });

  it("debería abrir Cobros cuando llega un aviso de MercadoPago",
  () =>
  {
    expect(normalizarSeccionConfig(undefined, true)).toBe("cobros");
    expect(normalizarSeccionConfig("mensajes", true)).toBe("mensajes");
  });
});
