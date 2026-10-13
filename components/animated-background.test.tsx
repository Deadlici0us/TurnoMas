import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AnimatedBackground from "./animated-background";

describe("AnimatedBackground",
() =>
{
  it("debería renderizar fondo oculto con aurora, grilla, tres brillos y viñeta",
  () =>
  {
    render(<AnimatedBackground />);

    const fondo = screen.getByTestId("fondo-animado");

    expect(fondo).toHaveAttribute("aria-hidden", "true");
    expect(fondo.children).toHaveLength(6);
  });

  it("debería incluir capa aurora y grilla con movimiento continuo",
  () =>
  {
    render(<AnimatedBackground />);

    const fondo = screen.getByTestId("fondo-animado");

    expect(fondo.innerHTML).toContain("animate-aurora");
    expect(fondo.innerHTML).toContain("animate-grid-pan");
    expect(fondo.innerHTML).toContain("animate-float-a");
    expect(fondo.innerHTML).toContain("animate-float-b");
    expect(fondo.innerHTML).toContain("animate-float-c");
  });

  it("debería quedar detrás del contenido en flujo",
  () =>
  {
    render(<AnimatedBackground />);

    expect(screen.getByTestId("fondo-animado").className).toContain("-z-10");
  });

  it("no debería exponer texto visible",
  () =>
  {
    render(<AnimatedBackground />);

    expect(screen.getByTestId("fondo-animado").textContent).toBe("");
  });
});
