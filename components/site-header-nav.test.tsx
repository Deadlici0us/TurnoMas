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
  menuLabel: "Abrir menú de cuenta",
  billingLabel: "Suscripción",
  accountLabel: "Mi cuenta",
} as const;

describe("SiteHeaderNav",
() =>
{
  it("debería mostrar login y registro para invitados",
  () =>
  {
    render(
      <SiteHeaderNav
        isAuthenticated={false}
        businessName={null}
        logoUrl={null}
        logoutAction={vi.fn()}
        {...LABELS}
      />,
    );

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Registrarse" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Abrir menú de cuenta" })).toBeNull();
  });

  it("debería mostrar el perfil para autenticados",
  () =>
  {
    render(
      <SiteHeaderNav
        isAuthenticated={true}
        businessName="Barbería Diego"
        logoUrl={null}
        logoutAction={vi.fn()}
        {...LABELS}
      />,
    );

    expect(screen.getByRole("button", { name: "Abrir menú de cuenta" })).toBeDefined();
    expect(screen.getByText("Barbería Diego")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Registrarse" })).toBeNull();
  });

  it("debería usar 'Mi cuenta' sin negocio",
  () =>
  {
    render(
      <SiteHeaderNav
        isAuthenticated={true}
        businessName={null}
        logoUrl={null}
        logoutAction={vi.fn()}
        {...LABELS}
      />,
    );

    expect(screen.getByText("Mi cuenta")).toBeDefined();
  });
});
