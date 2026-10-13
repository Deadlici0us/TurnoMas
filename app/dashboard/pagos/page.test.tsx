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
    mp_payment_id: null,
    ...overrides,
  };
}

function dashboardBase(turnos: unknown[] = [turnoBase()])
{
  return {
    negocio: { id: "neg-1", nombre: "Barbería", pais: "ar" },
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

  it("debería mostrar el nro de comprobante con botón para copiar",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({ id: "t-1", estado: "pagado", mp_payment_id: "1234567890" }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("1234567890")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar nro de comprobante" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "1234567890" })).toBeNull();
  });

  it("debería mostrar guion sin pago de MercadoPago",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({ id: "t-1", estado: "pendiente", mp_payment_id: null }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Comprobante")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("debería mostrar guion cuando el turno no trae la clave (seed demo)",
  async () =>
  {
    const turnoSinClave = turnoBase({ id: "t-1", estado: "pendiente" });

    delete (turnoSinClave as Record<string, unknown>).mp_payment_id;
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoSinClave]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Comprobante")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("debería mostrar el inicio con fecha completa y precisión de minutos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({ id: "t-1", inicio: "2026-10-05T14:07:00.000Z", estado: "pendiente" }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Inicio")).toBeDefined();
    expect(screen.getByText("05/10/2026 11:07")).toBeDefined();
  });

  it("debería mostrar la fecha de pago de la seña con precisión de segundos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({
          id: "t-1",
          estado: "pagado",
          inicio: "2026-10-05T14:07:00.000Z",
          updated_at: "2026-10-05T15:07:09.000Z",
        }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Pago seña")).toBeDefined();
    expect(screen.getByText("05/10/2026 12:07:09")).toBeDefined();
  });

  it("debería mostrar guion en pago de seña sin acreditación",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        turnoBase({ id: "t-1", estado: "pendiente", updated_at: "2026-10-05T15:07:09.000Z" }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    expect(screen.getByText("Pago seña")).toBeDefined();
    expect(screen.queryByText("05/10/2026 12:07:09")).toBeNull();
  });

  it("debería ordenar por fecha con recientes primero",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([]),
        clientes: [
          { id: "cli-1", nombre: "Juan" },
          { id: "cli-2", nombre: "Maria" },
        ],
        turnos: [
          turnoBase({ id: "t-viejo", cliente_id: "cli-1", inicio: "2026-10-01T14:00:00.000Z" }),
          turnoBase({ id: "t-nuevo", cliente_id: "cli-2", inicio: "2026-10-10T14:00:00.000Z" }),
        ],
      },
      error: null,
      isDemo: false,
    } as never);

    render(await PagosPage());

    const filas = screen.getAllByRole("row").slice(1);

    expect(filas[0]?.textContent).toContain("Maria");
    expect(filas[1]?.textContent).toContain("Juan");
  });
});
