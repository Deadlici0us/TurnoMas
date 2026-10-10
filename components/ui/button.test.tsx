import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button, buttonVariants } from "./button";

describe("buttonVariants",
() =>
{
  it("debería usar default y default por defecto",
  () =>
  {
    const clases = buttonVariants({});

    expect(clases).toContain("bg-primary");
    expect(clases).toContain("h-8");
  });

  it("debería resolver cada variante",
  () =>
  {
    expect(buttonVariants({ variant: "outline" })).toContain("border-border");
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
    expect(buttonVariants({ variant: "ghost" })).toContain("hover:bg-muted");
    expect(buttonVariants({ variant: "destructive" })).toContain("text-destructive");
    expect(buttonVariants({ variant: "link" })).toContain("hover:underline");
  });

  it("debería resolver cada tamaño",
  () =>
  {
    expect(buttonVariants({ size: "xs" })).toContain("h-6");
    expect(buttonVariants({ size: "sm" })).toContain("h-7");
    expect(buttonVariants({ size: "lg" })).toContain("h-9");
    expect(buttonVariants({ size: "icon" })).toContain("size-8");
    expect(buttonVariants({ size: "icon-xs" })).toContain("size-6");
    expect(buttonVariants({ size: "icon-sm" })).toContain("size-7");
    expect(buttonVariants({ size: "icon-lg" })).toContain("size-9");
  });

  it("debería anteponer className personalizado",
  () =>
  {
    expect(buttonVariants({ className: "mi-clase" })).toContain("mi-clase");
  });
});

describe("Button",
() =>
{
  it("debería renderizar con slot y variantes",
  () =>
  {
    render(<Button variant="destructive" size="sm">Eliminar</Button>);
    const boton = screen.getByRole("button", { name: "Eliminar" });

    expect(boton.getAttribute("data-slot")).toBe("button");
    expect(boton.className).toContain("text-destructive");
  });

  it("debería propagar props al primitivo",
  () =>
  {
    render(<Button disabled>Esperar</Button>);

    expect(screen.getByRole("button", { name: "Esperar" })).toBeDisabled();
  });
});
