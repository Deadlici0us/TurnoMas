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
    expect(clases).toContain("min-h-9");
  });

  it("debería resolver cada variante",
  () =>
  {
    expect(buttonVariants({ variant: "outline" })).toContain("border-line");
    expect(buttonVariants({ variant: "outline" })).toContain("bg-white");
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-soft");
    expect(buttonVariants({ variant: "ghost" })).toContain("hover:bg-soft");
    expect(buttonVariants({ variant: "destructive" })).toContain("text-danger");
    expect(buttonVariants({ variant: "link" })).toContain("hover:underline");
  });

  it("debería resolver cada tamaño",
  () =>
  {
    expect(buttonVariants({ size: "default" })).toContain("min-h-9");
    expect(buttonVariants({ size: "sm" })).toContain("min-h-[30px]");
    expect(buttonVariants({ size: "lg" })).toContain("min-h-11");
    expect(buttonVariants({ size: "icon" })).toContain("size-9");
    expect(buttonVariants({ size: "icon-sm" })).toContain("size-[30px]");
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
    expect(boton.className).toContain("text-danger");
  });

  it("debería propagar props al primitivo",
  () =>
  {
    render(<Button disabled>Esperar</Button>);

    expect(screen.getByRole("button", { name: "Esperar" })).toBeDisabled();
  });
});
