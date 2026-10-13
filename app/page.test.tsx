import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import HomePage from "./page";

vi.mock("next-intl", () =>
{
  const t = Object.assign((key: string) => key, { raw: () => ["Rapidez", "Soporte"] });

  return { useTranslations: () => t };
});

describe("HomePage",
() =>
{
  it("debería mostrar héroe y CTAs",
  () =>
  {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "appName" })).toBeDefined();
    expect(screen.getByText("hero.title")).toBeDefined();
    expect(screen.getByRole("link", { name: "hero.ctaPrimary" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "hero.ctaSecondary" })).toHaveAttribute("href", "/features");
  });

  it("debería listar las 4 features",
  () =>
  {
    render(<HomePage />);

    for (const key of ["features.señas.title", "features.recordatorios.title",
      "features.listaNegra.title", "features.agenda.title"])
    {
      expect(screen.getByText(key)).toBeDefined();
    }
  });

  it("debería mostrar precios y calculadora",
  () =>
  {
    render(<HomePage />);

    expect(screen.getByText("pricing.title")).toBeDefined();
    expect(screen.getByText("Rapidez")).toBeDefined();
    expect(screen.getByText("calculator.title")).toBeDefined();
    expect(screen.getByRole("link", { name: "pricing.cta" })).toHaveAttribute("href", "/register");
  });

  it("debería dejar ver el fondo animado con raíz transparente",
  () =>
  {
    const { container } = render(<HomePage />);
    const raiz = container.firstChild as HTMLElement;

    expect(raiz.className).toContain("bg-transparent");
    expect(raiz.className).not.toContain("from-slate-50");
    expect(raiz.className).not.toContain("bg-gradient-to-b");
  });

  it("debería usar animaciones de revelado con stagger en el héroe y las cards",
  () =>
  {
    const { container } = render(<HomePage />);
    const raiz = container.firstChild as HTMLElement;

    expect(raiz.innerHTML).toContain("animate-reveal-up");
    expect(raiz.innerHTML).toContain("animate-shimmer");
  });
});
