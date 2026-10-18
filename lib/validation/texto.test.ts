import { describe, expect, it } from "vitest";

import { limpiarControl } from "./texto";

describe("limpiarControl",
() =>
{
  it("debería quitar saltos de línea y tabs",
  () =>
  {
    expect(limpiarControl("Barbería\nDiego")).toBe("Barbería Diego");
    expect(limpiarControl("a\r\nb\tc")).toBe("a b c");
  });

  it("debería colapsar espacios y recortar",
  () =>
  {
    expect(limpiarControl("  hola   mundo  ")).toBe("hola mundo");
  });

  it("debería dejar intacto el texto normal",
  () =>
  {
    expect(limpiarControl("Juan Pérez")).toBe("Juan Pérez");
  });
});
