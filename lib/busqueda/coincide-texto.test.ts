import { describe, expect, it } from "vitest";

import { coincideTexto, normalizarTexto } from "@/lib/busqueda/coincide-texto";

describe("normalizarTexto",
() =>
{
  it("debería quitar acentos, mayúsculas y espacios sobrantes",
  () =>
  {
    expect(normalizarTexto("  Ána   PÉREZ  ")).toBe("ana perez");
  });

  it("debería respetar textos vacíos",
  () =>
  {
    expect(normalizarTexto("   ")).toBe("");
  });
});

describe("coincideTexto",
() =>
{
  it("debería devolver true con una consulta vacía",
  () =>
  {
    expect(coincideTexto(["Corte"], "   ")).toBe(true);
  });

  it("debería ignorar acentos y mayúsculas",
  () =>
  {
    expect(coincideTexto(["Ána Pérez"], "ana")).toBe(true);
    expect(coincideTexto(["ana perez"], "PÉREZ")).toBe(true);
  });

  it("debería coincidir con el email sin distinguir mayúsculas",
  () =>
  {
    expect(coincideTexto(["Mail@Ejemplo.com"], "mail@ejemplo")).toBe(true);
  });

  it("debería coincidir por fragmento de teléfono con al menos tres dígitos",
  () =>
  {
    expect(coincideTexto(["+54 9 11 6453-4124"], "6453")).toBe(true);
    expect(coincideTexto(["+54 9 11 6453-4124"], "64534124")).toBe(true);
  });

  it("no debería coincidir con fragmentos cortos de teléfono",
  () =>
  {
    expect(coincideTexto(["+54 9 11 6453-4124"], "11")).toBe(false);
  });

  it("debería ignorar campos nulos o vacíos",
  () =>
  {
    expect(coincideTexto([null, undefined, "", "Corte"], "corte")).toBe(true);
  });

  it("debería devolver false cuando ningún campo coincide",
  () =>
  {
    expect(coincideTexto(["Corte", "ana@test.com"], "color")).toBe(false);
  });
});
