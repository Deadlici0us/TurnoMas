import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ClienteDetallePage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("next/navigation", () =>
{
  return {
    notFound: vi.fn(() =>
    {
      throw new Error("NEXT_NOT_FOUND");
    }),
  };
});

vi.mock("next/link", () =>
{
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);

function clienteBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "cli-1",
    nombre: "Juan Pérez",
    whatsapp: "+5491112345678",
    ausencias: 0,
    bloqueado: false,
    ...overrides,
  };
}

function dashboardBase(clientes: unknown[] = [clienteBase()], turnos: unknown[] = [])
{
  return {
    negocio: {
      id: "neg-1",
      nombre: "Barbería",
      pais: "ar",
      slug: "barberia",
      timezone: "America/Argentina/Buenos_Aires",
      blacklist_umbral: 2,
      blacklist_penalidad: "fullDeposit",
    },
    staff: [{ id: "staff-1", nombre: "Diego" }],
    servicios: [{ id: "serv-1", nombre: "Corte clásico" }],
    clientes,
    turnos,
  };
}

function params(id = "cli-1")
{
  return Promise.resolve({ id });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("ClienteDetallePage",
() =>
{
  it("debería mostrar la ficha y el historial de servicios",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase()], [
        {
          id: "t-1",
          cliente_id: "cli-1",
          servicio_id: "serv-1",
          staff_id: "staff-1",
          inicio: "2026-10-05T14:00:00.000Z",
          estado: "completado",
          monto_total: 1500000,
          sena_monto: null,
        },
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClienteDetallePage({ params: params() }));

    expect(screen.getByRole("heading", { name: "Juan Pérez" })).toBeDefined();
    expect(screen.getByText("+5491112345678")).toBeDefined();
    expect(screen.getAllByText("Corte clásico").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Diego").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Completado").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/15[.,]?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Agregar turno" }).getAttribute("href"))
      .toBe("/dashboard/agenda/nuevo?clienteId=cli-1");
  });

  it("debería mostrar el estado de lista negra del cliente",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase({ bloqueado: true })]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClienteDetallePage({ params: params() }));

    expect(screen.getByText("Bloqueado")).toBeDefined();
  });

  it("debería avisar cuando el cliente no tiene turnos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase(),
      error: null,
      isDemo: false,
    } as never);

    render(await ClienteDetallePage({ params: params() }));

    expect(screen.getByText("Este cliente todavía no tuvo turnos.")).toBeDefined();
  });

  it("debería enlazar de vuelta a Clientes",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase(),
      error: null,
      isDemo: false,
    } as never);

    render(await ClienteDetallePage({ params: params() }));

    const link = screen.getByRole("link", { name: /Clientes/ });

    expect(link.getAttribute("href")).toBe("/dashboard/clientes");
  });

  it("debería devolver 404 si el cliente no existe",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase(),
      error: null,
      isDemo: false,
    } as never);

    await expect(ClienteDetallePage({ params: params("inexistente") })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
