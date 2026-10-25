import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ServiciosPage from "./page";
import { cambiarEstadoServicio, eliminarServicio, guardarServicio } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("./actions", () =>
{
  return {
    guardarServicio: vi.fn(),
    eliminarServicio: vi.fn(),
    cambiarEstadoServicio: vi.fn(),
  };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);

function servicioBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "serv-1",
    nombre: "Corte",
    duracion_min: 30,
    precio_base: 15000,
    precio_promocional: 12000,
    sena_requerida: true,
    sena_porcentaje: 50,
    remarketing: true,
    remarketing_dias: 15,
    activo: true,
    ...overrides,
  };
}

describe("ServiciosPage",
() =>
{
  it("debería mostrar el formulario de alta",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: { negocio: { id: "neg-1" }, staff: [], servicios: [], clientes: [], turnos: [] },
      error: null,
    } as never);

    render(await ServiciosPage());

    expect(screen.getByRole("heading", { name: "Servicios" })).toBeDefined();
    expect(screen.getByText("Nuevo servicio")).toBeDefined();
    const boton = screen.getByRole("button", { name: "Agregar servicio" });
    expect(boton.closest("form")?.closest(".ui-card")).not.toBeNull();
  });

  it("debería mostrar promo, seña y remarketing",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        negocio: { id: "neg-1" },
        staff: [],
        servicios: [servicioBase()],
        clientes: [],
        turnos: [],
      },
      error: null,
    } as never);

    render(await ServiciosPage());

    expect(screen.getByText("Corte")).toBeDefined();
    expect(screen.getByText(/Promo: \$/)).toBeDefined();
    expect(screen.getByText("Seña 50%")).toBeDefined();
    expect(screen.getByText("Remarketing 15d")).toBeDefined();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDefined();
  });

  it("debería mostrar inactivo sin promo ni seña ni remarketing",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        negocio: { id: "neg-1" },
        staff: [],
        servicios: [servicioBase({
          precio_promocional: null,
          sena_requerida: false,
          remarketing: false,
          activo: false,
        })],
        clientes: [],
        turnos: [],
      },
      error: null,
    } as never);

    render(await ServiciosPage());

    expect(screen.getByText("(Inactivo)")).toBeDefined();
    expect(screen.getByText("Sin seña")).toBeDefined();
    expect(screen.getByText("Sin remarketing")).toBeDefined();
    expect(screen.queryByText(/Promo:/)).toBeNull();
    expect(screen.getByRole("button", { name: "Activar" })).toBeDefined();
  });

  it("debería usar 30 días de remarketing por defecto",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        negocio: { id: "neg-1" },
        staff: [],
        servicios: [servicioBase({ remarketing: undefined, remarketing_dias: undefined })],
        clientes: [],
        turnos: [],
      },
      error: null,
    } as never);

    render(await ServiciosPage());

    expect(screen.getByText("Remarketing 30d")).toBeDefined();
  });

  it("debería filtrar servicios mientras se escribe", async () =>
  {
    const user = userEvent.setup();
    mockData.mockResolvedValueOnce({
      data: {
        negocio: { id: "neg-1" },
        staff: [],
        servicios: [servicioBase(), servicioBase({ id: "serv-2", nombre: "Color" })],
        clientes: [],
        turnos: [],
      },
      error: null,
    } as never);

    render(await ServiciosPage());

    await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre de servicio" }), "color");

    expect(screen.queryByText("Corte")).toBeNull();
    expect(screen.getByText("Color")).toBeDefined();
  });

  it("debería invocar las acciones al enviar formularios",
  async () =>
  {
    const user = userEvent.setup();
    mockData.mockResolvedValueOnce({
      data: {
        negocio: { id: "neg-1" },
        staff: [],
        servicios: [servicioBase()],
        clientes: [],
        turnos: [],
      },
      error: null,
    } as never);

    render(await ServiciosPage());

    const nombre = document.querySelector('input[name="nombre"]') as HTMLInputElement;
    const precio = document.querySelector('input[name="precioBase"]') as HTMLInputElement;
    await user.type(nombre, "Nuevo servicio");
    await user.type(precio, "5000");
    await user.click(screen.getByRole("button", { name: "Agregar servicio" }));

    expect(vi.mocked(guardarServicio)).toHaveBeenCalledWith(null, expect.any(FormData));

    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(vi.mocked(cambiarEstadoServicio)).toHaveBeenCalledWith("serv-1", false);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(vi.mocked(eliminarServicio)).toHaveBeenCalledWith("serv-1");

    await user.click(screen.getByText("Editar"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(vi.mocked(guardarServicio)).toHaveBeenCalledWith("serv-1", expect.any(FormData));
  });
});
