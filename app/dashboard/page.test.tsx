import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardPage from "./page";
import { getDashboardData, getDashboardStats } from "@/lib/dashboard/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("next-intl/server", () =>
{
  return { getTranslations: async () => (key: string) => key };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn(), getDashboardStats: vi.fn() };
});

vi.mock("@/lib/onboarding/subscription-gate", () =>
{
  return { getNegocioSubscriptionStatus: vi.fn(() => "active") };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);
const mockStats = vi.mocked(getDashboardStats);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Secretos sin token de MercadoPago. */
function stubSinMp(): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { mercadopago_access_token: null } }),
        }),
      }),
    }),
  } as never);
}

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
  it("debería avisar mora con link a facturación",
  async () =>
  {
    const { getNegocioSubscriptionStatus } =
      await import("@/lib/onboarding/subscription-gate");
    vi.mocked(getNegocioSubscriptionStatus).mockReturnValueOnce("past_due" as never);
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);
    mockStats.mockResolvedValueOnce(STATS);

    render(await DashboardPage());

    expect(screen.getByText("Falló el último cobro del plan. Regularizá tu tarjeta para no perder el acceso.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver suscripción" })).toHaveAttribute("href", "/dashboard/suscripcion");
  });

  it("debería avisar conexión MP con señas sin conectar",
  async () =>
  {
    stubSinMp();
    mockData.mockResolvedValueOnce({
      data: dashboardBase({ servicios: [{ id: "serv-1", nombre: "Corte", sena_requerida: true }] }),
      error: null,
      isDemo: false,
    } as never);
    mockStats.mockResolvedValueOnce(STATS);

    render(await DashboardPage());

    expect(screen.getByText("Tenés servicios con seña pero sin MercadoPago conectado: las reservas quedan pendientes sin link de pago.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Conectar MercadoPago" })).toHaveAttribute("href", "/dashboard/config");
  });

  it("debería mostrar nombre, 4 indicadores y próximos turnos",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);
    mockStats.mockResolvedValueOnce(STATS);

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Barbería" })).toBeDefined();
    expect(screen.getByText("Turnos hoy")).toBeDefined();
    expect(screen.getByText("Pendientes")).toBeDefined();
    expect(screen.getByText("Señas cobradas")).toBeDefined();
    expect(screen.getByText("Ingresos por señas")).toBeDefined();
    expect(screen.queryByText("Confirmados")).toBeNull();
    expect(screen.getByRole("heading", { name: "Próximos turnos" })).toBeDefined();
    expect(screen.getByText("Corte")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText(/\$ 100/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Ver agenda" })).toHaveAttribute("href", "/dashboard/agenda");
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
    expect(screen.getAllByText("Servicio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cliente")).toBeDefined();
    expect(screen.getAllByText("$ 0").length).toBeGreaterThanOrEqual(1);
  });
});
