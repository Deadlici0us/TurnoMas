import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AnimatedBackground from "./animated-background";

describe("AnimatedBackground",
() =>
{
  it("debería renderizar fondo oculto con tres brillos y viñeta",
  () =>
  {
    render(<AnimatedBackground />);

    const fondo = screen.getByTestId("fondo-animado");

    expect(fondo).toHaveAttribute("aria-hidden", "true");
    expect(fondo.children).toHaveLength(4);
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
