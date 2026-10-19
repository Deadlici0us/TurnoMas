import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import NuevoTurnoPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("./actions", () =>
{
  return { crearTurnoManual: vi.fn() };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);

function dashboardBase(overrides: Record<string, unknown> = {})
{
  return {
    negocio: {
      id: "neg-1",
      nombre: "Barbería",
      timezone: "America/Argentina/Buenos_Aires",
      pais: "ar",
    },
    staff: [{ id: "staff-1", nombre: "Diego", activo: true }],
    servicios: [
      { id: "serv-1", nombre: "Corte", duracion_min: 30, precio_base: 1000000,
        precio_promocional: null, activo: true },
    ],
    asociaciones: [{ staffId: "staff-1", servicioId: "serv-1" }],
    clientes: [
      { id: "cli-1", nombre: "Juan Pérez", whatsapp: "+549110000001", email: "juan@ejemplo.com" },
    ],
    turnos: [],
    ...overrides,
  };
}

beforeEach(() =>
{
  vi.clearAllMocks();
});

describe("NuevoTurnoPage",
() =>
{
  it("debería precargar el cliente indicado por query",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ clienteId: "cli-1" }) }));

    expect(screen.getByRole("heading", { name: "Nuevo turno" })).toBeDefined();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000001");
    expect((screen.getByLabelText("Email (opcional)") as HTMLInputElement).value).toBe("juan@ejemplo.com");
  });

  it("debería respetar la fecha de la query y ofrecer volver a la agenda",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ fecha: "2026-11-20" }) }));

    expect((screen.getByLabelText("Fecha") as HTMLInputElement).value).toBe("2026-11-20");
    expect(screen.getByRole("link", { name: "Volver a la agenda" }).getAttribute("href"))
      .toBe("/dashboard/agenda");
  });

  it("debería caer en la fecha de hoy con una fecha inválida",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ fecha: "hoy" }) }));

    expect((screen.getByLabelText("Fecha") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
