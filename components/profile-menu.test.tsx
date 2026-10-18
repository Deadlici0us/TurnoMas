import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProfileMenu from "./profile-menu";

const LABELS =
{
  menuLabel: "Abrir menú de cuenta",
  dashboardLabel: "Panel",
  configLabel: "Configuración",
  billingLabel: "Suscripción",
  logoutLabel: "Cerrar sesión",
} as const;

describe("ProfileMenu",
() =>
{
  it("debería mostrar el nombre del negocio en el trigger",
  () =>
  {
    render(<ProfileMenu businessName="Barbería Diego" logoUrl={null} logoutAction={vi.fn()} {...LABELS} />);

    expect(screen.getByRole("button", { name: "Abrir menú de cuenta" })).toBeDefined();
    expect(screen.getByText("Barbería Diego")).toBeDefined();
  });

  it("debería abrir el menú con navegación y logout",
  async () =>
  {
    const user = userEvent.setup();
    render(<ProfileMenu businessName="Barbería Diego" logoUrl={null} logoutAction={vi.fn()} {...LABELS} />);

    await user.click(screen.getByRole("button", { name: "Abrir menú de cuenta" }));

    expect(await screen.findByRole("menuitem", { name: "Panel" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Configuración" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Suscripción" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeDefined();
  });
});
