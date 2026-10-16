import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardLayout from "./layout";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("next/navigation", () =>
{
  return { usePathname: vi.fn(() => "/dashboard") };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/app/dashboard/facturacion/actions", () =>
{
  return { activarPlan: vi.fn() };
});

vi.mock("@/app/login/actions", () =>
{
  return { logout: vi.fn() };
});

vi.mock("@/app/dashboard/demo/actions", () =>
{
  return { resetDemoData: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);

/** Dashboard con el negocio dado. */
function stubDashboard(negocio: Record<string, unknown>, isDemo = false): void
{
  mockData.mockResolvedValueOnce({
    data: { negocio, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
    isDemo,
  } as never);
}

describe("DashboardLayout",
  () =>
  {
    it("debería mostrar el paywall cuando el plan está vencido",
    async () =>
    {
      stubDashboard({
        created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
        pais: "ar",
        suscripcion_estado: null,
        suscripcion_mp_id: null,
      });

      render(await DashboardLayout({ children: <div>contenido</div> }));

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Activar plan $ 14.999 ARS/mes" })).toBeDefined();
    });

    it("no debería mostrar el paywall con el plan activo",
    async () =>
    {
      stubDashboard({
        created_at: "2026-01-01T00:00:00Z",
        pais: "ar",
        suscripcion_estado: "active",
        suscripcion_mp_id: "pre-1",
      });

      render(await DashboardLayout({ children: <div>contenido</div> }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText("contenido")).toBeDefined();
    });

    it("debería mostrar el paywall también en la demo bloqueada",
    async () =>
    {
      stubDashboard({
        created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
        pais: "ar",
        suscripcion_estado: null,
        suscripcion_mp_id: null,
      }, true);

      render(await DashboardLayout({ children: <div>contenido</div> }));

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Tu plan venció" })).toBeDefined();
    });
  });
