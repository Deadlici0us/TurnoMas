import { describe, expect, it } from "vitest";

import { sanitizeUrlExterna } from "./url";

describe("sanitizeUrlExterna",
() =>
{
  it("debería aceptar http y https y normalizar",
  () =>
  {
    expect(sanitizeUrlExterna("https://turnomas.com/logo.png")).toBe("https://turnomas.com/logo.png");
    expect(sanitizeUrlExterna("http://a.com/x")).toBe("http://a.com/x");
  });

  it("debería rechazar esquemas peligrosos",
  () =>
  {
    expect(sanitizeUrlExterna("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrlExterna("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeUrlExterna("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeUrlExterna("file:///etc/passwd")).toBeNull();
  });

  it("debería rechazar vacíos, no-strings y basura",
  () =>
  {
    expect(sanitizeUrlExterna(null)).toBeNull();
    expect(sanitizeUrlExterna(undefined)).toBeNull();
    expect(sanitizeUrlExterna("   ")).toBeNull();
    expect(sanitizeUrlExterna(123)).toBeNull();
    expect(sanitizeUrlExterna("no es una url")).toBeNull();
    expect(sanitizeUrlExterna("/ruta/interna")).toBeNull();
  });

  it("debería tolerar espacios alrededor", () =>
  {
    expect(sanitizeUrlExterna("  https://a.com  ")).toBe("https://a.com/");
  });
});
