import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteHeaderNav from "@/components/site-header-nav";

const LABELS =
{
  appName: "TurnoMas",
  homeLabel: "Inicio",
  loginLabel: "Iniciar sesión",
  registerLabel: "Registrarse",
  logoutLabel: "Cerrar sesión",
} as const;

describe("SiteHeaderNav",
() =>
{
  it("debería mostrar login y registro para invitados",
  () =>
  {
    render(<SiteHeaderNav isAuthenticated={false} logoutAction={vi.fn()} {...LABELS} />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Registrarse" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("debería mostrar cerrar sesión para autenticados",
  () =>
  {
    render(<SiteHeaderNav isAuthenticated={true} logoutAction={vi.fn()} {...LABELS} />);

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Registrarse" })).toBeNull();
  });
});
