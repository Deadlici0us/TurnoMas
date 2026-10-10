import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardPage from "./page";
import { getDashboardData, getDashboardStats } from "@/lib/dashboard/queries";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

vi.mock("next/navigation", () =>
{
  return {
    redirect: (url: string) =>
    {
      throw new Error(`NEXT_REDIRECT:${url}`);
    },
  };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn(), getDashboardStats: vi.fn() };
});

vi.mock("@/lib/onboarding/subscription-gate", () =>
{
  return { getNegocioSubscriptionStatus: vi.fn(() => "active") };
});

const mockData = vi.mocked(getDashboardData);
const mockStats = vi.mocked(getDashboardStats);

const STATS = {
  turnosHoy: 2,
  pendientes: 1,
  confirmados: 1,
  pagados: 0,
  completados: 0,
  ausentes: 0,
  cancelados: 0,
  totalIngresos: 5000,
};

/** Dashboard con un turno confirmado con nombres. */
function dashboardBase(overrides: Record<string, unknown> = {})
{
  return {
    negocio: { id: "neg-1", nombre: "Barbería", created_at: null },
    staff: [],
    servicios: [{ id: "serv-1", nombre: "Corte" }],
    clientes: [{ id: "cli-1", nombre: "Juan" }],
    turnos: [{
      id: "t-1",
      estado: "confirmado",
      servicio_id: "serv-1",
      cliente_id: "cli-1",
      monto_total: 10000,
    }],
    ...overrides,
  };
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("DashboardPage",
() =>
{
  it("debería redirigir a pricing cuando está bloqueado",
  async () =>
  {
    const { getNegocioSubscriptionStatus } =
      await import("@/lib/onboarding/subscription-gate");
    vi.mocked(getNegocioSubscriptionStatus).mockReturnValueOnce("blocked" as never);
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/pricing?blocked=1");
  });

  it("debería mostrar nombre, stats y tabla",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);
    mockStats.mockResolvedValueOnce(STATS);

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Barbería" })).toBeDefined();
    expect(screen.getByText("Turnos hoy")).toBeDefined();
    expect(screen.getByText("Corte")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText(/10[.,]000/)).toBeDefined();
  });

  it("debería usar fallbacks sin nombres ni montos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase({
        negocio: { id: "neg-1", nombre: null, created_at: null },
        servicios: [],
        clientes: [],
        turnos: [{
          id: "t-2",
          estado: "pendiente",
          servicio_id: "missing",
          cliente_id: "missing",
          monto_total: null,
        }],
      }),
      error: null,
      isDemo: false,
    } as never);
    mockStats.mockResolvedValueOnce({ ...STATS, totalIngresos: 0 });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "appName" })).toBeDefined();
    expect(screen.getAllByText("Servicio").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Cliente").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("$ 0")).toHaveLength(2);
  });
});
