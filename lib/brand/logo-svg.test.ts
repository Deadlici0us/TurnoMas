import { describe, expect, it } from "vitest";

import { buildLogoSvg } from "./logo-svg";

describe("buildLogoSvg",
() =>
{
  it("debería usar el azul de marca y el icono blanco",
  () =>
  {
    const svg = buildLogoSvg({ size: 512 });

    expect(svg).toContain('width="512"');
    expect(svg).toContain('fill="#06adef"');
    expect(svg).toContain('stroke="#ffffff"');
    expect(svg).toContain("<circle");
  });

  it("debería simplificar el icono en tamaños chicos",
  () =>
  {
    const standard = buildLogoSvg({ size: 16 });
    const simplified = buildLogoSvg({ size: 16, simplified: true });

    expect(standard).toContain("M16 14v2.2l1.6 1");
    expect(simplified).not.toContain("M16 14v2.2l1.6 1");
  });

  it("debería permitir esquinas redondeadas",
  () =>
  {
    const svg = buildLogoSvg({ size: 100, rounded: true });

    expect(svg).toContain('rx="20"');
  });
});
