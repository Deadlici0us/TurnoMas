import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import PagosPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);

function turnoBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    cliente_id: "cli-1",
    servicio_id: "serv-1",
    inicio: "2026-10-05T14:00:00.000Z",
    estado: "pendiente",
    monto_total: 10000,
    sena_monto: 5000,
    ...overrides,
  };
}

function dashboardBase(turnos: unknown[] = [turnoBase()])
{
  return {
    negocio: { id: "neg-1", nombre: "Barbería" },
    staff: [],
    servicios: [{ id: "serv-1", nombre: "Corte" }],
    clientes: [{ id: "cli-1", nombre: "Juan" }],
    turnos,
  };
}

describe("PagosPage",
() =>
{
  it("debería mostrar pendiente a cobrar y filas",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await PagosPage());

    expect(screen.getByRole("heading", { name: "Pagos" })).toBeDefined();
    expect(screen.getByText("Pendiente cobrar")).toBeDefined();
    expect(screen.getByText("Juan")).toBeDefined();
    expect(screen.getByText("Corte")).toBeDefined();
  });

  it("debería sumar confirmado completo y pendiente neto",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({ id: "t-1", estado: "pendiente", monto_total: 10000, sena_monto: 5000 }),
        turnoBase({ id: "t-2", estado: "confirmado", monto_total: 8000, sena_monto: null }),
        turnoBase({ id: "t-3", estado: "pagado", monto_total: 8000, sena_monto: 8000 }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText(/ARS\s+130/)).toBeDefined();
  });

  it("debería usar fallbacks y guiones sin datos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({
          id: "t-9",
          cliente_id: "missing",
          servicio_id: "missing",
          monto_total: null,
          sena_monto: null,
        }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getAllByText("Cliente").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Servicio").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("debería avisar sin movimientos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Todavía no hay movimientos.")).toBeDefined();
  });
});
