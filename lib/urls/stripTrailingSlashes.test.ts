import { describe, expect, it } from "vitest";

import { stripSurroundingQuotes, stripTrailingSlashes } from "./stripTrailingSlashes";

describe("stripTrailingSlashes", () =>
{
  it("devuelve cadena vacía intacta", () =>
  {
    expect(stripTrailingSlashes("")).toBe("");
  });

  it("elimina barras finales simples y múltiples", () =>
  {
    expect(stripTrailingSlashes("https://example.com/")).toBe("https://example.com");
    expect(stripTrailingSlashes("https://example.com///")).toBe("https://example.com");
    expect(stripTrailingSlashes("/")).toBe("");
    expect(stripTrailingSlashes("///")).toBe("");
  });

  it("conserva URLs sin barra final", () =>
  {
    expect(stripTrailingSlashes("https://example.com/foo")).toBe("https://example.com/foo");
    expect(stripTrailingSlashes("https://example.com/foo//")).toBe("https://example.com/foo");
  });
});

describe("stripSurroundingQuotes", () =>
{
  it("elimina comillas simples y dobles envolventes", () =>
  {
    expect(stripSurroundingQuotes('"https://example.com"')).toBe("https://example.com");
    expect(stripSurroundingQuotes("'https://example.com'")).toBe("https://example.com");
    expect(stripSurroundingQuotes('""https://example.com""')).toBe("https://example.com");
    expect(stripSurroundingQuotes("https://example.com")).toBe("https://example.com");
    expect(stripSurroundingQuotes("")).toBe("");
  });
});
