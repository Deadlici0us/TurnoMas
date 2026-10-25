import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Auditoría estática de los tokens visuales y del sistema de movimiento.
 *
 * El rediseño SimplyBook depende de una paleta clara, una tipografía propia
 * y animaciones centralizadas. Si alguien vuelve a introducir el tema oscuro
 * o los efectos neón, este test debe fallar.
 */

const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("tokens del tema claro",
() =>
{
  it("debería definir la paleta SimplyBook",
  () =>
  {
    expect(CSS).toContain("--surface: #f8faff");
    expect(CSS).toContain("--sidebar: #313e54");
    expect(CSS).toContain("--primary: #06adef");
    expect(CSS).toContain("--cta: #ff3259");
    expect(CSS).toContain("--ink: #253246");
    expect(CSS).toContain("--line: #e7ecf7");
  });

  it("debería definir las animaciones de feedback",
  () =>
  {
    for (const keyframe of ["toast-in", "toast-out", "fade-up", "scale-in", "check-draw",
      "success-pulse", "shake", "row-flash", "spin"])
    {
      expect(CSS).toContain(`@keyframes ${keyframe}`);
    }
  });

  it("debería respetar prefers-reduced-motion",
  () =>
  {
    expect(CSS).toMatch(/prefers-reduced-motion/);
    expect(CSS).toMatch(/animation:\s*none/);
  });

  it("debería revelar por scroll con fallback sin JavaScript",
  () =>
  {
    expect(CSS).toContain('[data-reveal="true"]');
    expect(CSS).toContain("@media (scripting: enabled)");
    expect(CSS).toContain('[data-reveal="true"][data-visible="true"]');
  });

  it("no debería conservar los efectos neón del tema anterior",
  () =>
  {
    expect(CSS).not.toContain("animate-aurora");
    expect(CSS).not.toContain("animate-grid-pan");
    expect(CSS).not.toContain("animate-shimmer");
  });
});
