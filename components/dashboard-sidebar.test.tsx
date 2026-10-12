import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DashboardSidebar from "./dashboard-sidebar";

vi.mock("next/navigation", () =>
{
  return { usePathname: vi.fn(() => "/dashboard") };
});

describe("DashboardSidebar",
() =>
{
  it("debería listar las ocho secciones en español",
  () =>
  {
    render(<DashboardSidebar />);

    for (const nombre of ["Panel", "Agenda", "Equipo", "Servicios", "Clientes", "Pagos", "Configuración", "Facturación"])
    {
      expect(screen.getByRole("link", { name: nombre })).toBeDefined();
    }
  });

  it("debería marcar la sección activa según la ruta",
  async () =>
  {
    const { usePathname } = await import("next/navigation");

    vi.mocked(usePathname).mockReturnValueOnce("/dashboard/agenda");
    render(<DashboardSidebar />);

    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Panel" })).not.toHaveAttribute("aria-current");
  });

  it("debería abrir y cerrar el menú móvil",
  async () =>
  {
    const user = userEvent.setup();

    render(<DashboardSidebar />);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cerrar menú" }));

    expect(screen.getByRole("button", { name: "Abrir menú" })).toBeDefined();
  });
});
