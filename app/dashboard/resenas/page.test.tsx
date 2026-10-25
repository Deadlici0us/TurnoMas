import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ResenasPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";
import { listarResenas } from "@/lib/resenas/queries";

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/lib/resenas/queries", () =>
{
  return { listarResenas: vi.fn() };
});

vi.mock("@/app/dashboard/resenas/actions", () =>
{
  return { marcarResenaResuelta: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);
const mockListar = vi.mocked(listarResenas);

function stubDashboard(negocio: Record<string, unknown>): void
{
  mockData.mockResolvedValue({
    data: { negocio, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
    userEmail: "duenio@negocio.com",
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
  mockListar.mockResolvedValue([]);
});

describe("ResenasPage",
() =>
{
  it("debería listar las reseñas capturadas",
  async () =>
  {
    stubDashboard({ id: "neg-1", nombre: "Barbería", resena_activa: true });
    mockListar.mockResolvedValueOnce([
      { id: "r-1", estrellas: 2, comentario: "Tardó mucho", resuelto: false,
        fecha: "2026-10-18T10:00:00Z", cliente: "Ana", whatsapp: "+549110000001", servicio: "Corte" },
    ]);

    render(await ResenasPage());

    expect(screen.getByRole("heading", { name: "Reseñas" })).toBeDefined();
    expect(screen.getByText("Ana")).toBeDefined();
    expect(screen.getByText("Tardó mucho")).toBeDefined();
    expect(mockListar).toHaveBeenCalledWith("neg-1");
  });

  it("debería avisar cuando las reseñas están desactivadas",
  async () =>
  {
    stubDashboard({ id: "neg-1", nombre: "Barbería", resena_activa: false });

    render(await ResenasPage());

    expect(screen.getByText("Reseñas desactivadas.")).toBeDefined();
    expect(mockListar).not.toHaveBeenCalled();
  });
});
