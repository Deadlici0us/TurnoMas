import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Link from "next/link";

import AuthCard from "./auth-card";

describe("AuthCard",
() =>
{
  it("debería renderizar título, subtítulo e hijos",
  () =>
  {
    render(
      <AuthCard title="Entrar" subtitle="Bienvenido de nuevo">
        <button>Continuar</button>
      </AuthCard>,
    );

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeDefined();
    expect(screen.getByText("Bienvenido de nuevo")).toBeDefined();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("debería mostrar el error como alerta",
  () =>
  {
    render(
      <AuthCard title="Entrar" subtitle="Hola" error="Credenciales inválidas">
        <span />
      </AuthCard>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
  });

  it("debería ocultar errores vacíos o nulos",
  () =>
  {
    const { rerender } = render(
      <AuthCard title="T" subtitle="S" error="">
        <span />
      </AuthCard>,
    );

    expect(screen.queryByRole("alert")).toBeNull();

    rerender(
      <AuthCard title="T" subtitle="S" error={null}>
        <span />
      </AuthCard>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("debería renderizar el pie cuando se provee",
  () =>
  {
    render(
      <AuthCard title="T" subtitle="S" footer={<Link href="/register">Crear cuenta</Link>}>
        <span />
      </AuthCard>,
    );

    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeDefined();
  });

  it("debería usar la superficie clara y la tarjeta del sistema",
  () =>
  {
    const { container } = render(
      <AuthCard title="T" subtitle="S">
        <span />
      </AuthCard>,
    );
    const raiz = container.firstChild as HTMLElement;

    expect(raiz.className).toContain("bg-surface");
    expect(raiz.innerHTML).toContain("ui-card");
    expect(raiz.innerHTML).not.toContain("backdrop-blur");
  });
});
