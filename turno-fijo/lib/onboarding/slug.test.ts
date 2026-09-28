import { describe, expect, it } from "vitest";

import
{
  buildBusinessUrl,
  slugifyBusinessName,
} from "./slug";

describe("slugifyBusinessName",
() =>
{
  it("debería generar un slug en minúsculas con guiones",
  () =>
  {
    expect(slugifyBusinessName("Barbería Diego")).toBe("barberia-diego");
  });

  it("debería quitar acentos, espacios extra y caracteres especiales",
  () =>
  {
    expect(slugifyBusinessName("  Estética  & Spa ¡Premium!  ")).toBe("estetica-spa-premium");
  });

  it("debería colapsar guiones repetidos",
  () =>
  {
    expect(slugifyBusinessName("Pelu -- Quer separately")).toBe("pelu-quer-separately");
  });

  it("debería rechazar nombres vacíos o sin caracteres válidos",
  () =>
  {
    expect(() => slugifyBusinessName("")).toThrow(RangeError);
    expect(() => slugifyBusinessName("   ")).toThrow(RangeError);
    expect(() => slugifyBusinessName("!!!")).toThrow(RangeError);
  });
});

describe("buildBusinessUrl",
() =>
{
  it("debería construir la URL pública del negocio",
  () =>
  {
    expect(buildBusinessUrl("ar", "Barbería Diego")).toBe("/ar/barberia-diego");
  });

  it("debería normalizar el código de país a minúsculas",
  () =>
  {
    expect(buildBusinessUrl("AR", "Barbería Diego")).toBe("/ar/barberia-diego");
  });

  it("debería rechazar códigos de país inválidos",
  () =>
  {
    expect(() => buildBusinessUrl("", "Barbería Diego")).toThrow(RangeError);
    expect(() => buildBusinessUrl("arg", "Barbería Diego")).toThrow(RangeError);
    expect(() => buildBusinessUrl("1a", "Barbería Diego")).toThrow(RangeError);
  });
});
