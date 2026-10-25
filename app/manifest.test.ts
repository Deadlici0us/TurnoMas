import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest",
() =>
{
  it("debería declarar la marca, el tema y la PWA",
  () =>
  {
    const result = manifest();

    expect(result.name).toBe("TurnoMas");
    expect(result.display).toBe("standalone");
    expect(result.theme_color).toBe("#06adef");
    expect(result.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/brand/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/brand/icon-512.png", sizes: "512x512" }),
      expect.objectContaining({ src: "/brand/icon-maskable-512.png", purpose: "maskable" }),
    ]));
  });
});
