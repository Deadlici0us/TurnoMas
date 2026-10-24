import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StaffPage from "./page";
import { actualizarHorariosStaff, agregarStaff, cambiarEstadoStaff, eliminarStaff } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("./actions", () =>
{
  return {
    agregarStaff: vi.fn(),
    actualizarHorariosStaff: vi.fn(),
    actualizarPerfilStaff: vi.fn(),
    actualizarFotoStaff: vi.fn(),
    cambiarEstadoStaff: vi.fn(),
    eliminarStaff: vi.fn(),
  };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ refresh: vi.fn() }) };
});

const mockData = vi.mocked(getDashboardData);

function dashboardBase(staff: unknown[] = [])
{
  return {
    negocio: { id: "neg-1", nombre: "Barbería" },
    staff,
    servicios: [],
    clientes: [],
    turnos: [],
  };
}

describe("StaffPage",
() =>
{
  it("debería mostrar el equipo y el formulario de alta",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await StaffPage());

    expect(screen.getByRole("heading", { name: "Equipo" })).toBeDefined();
    expect(screen.getByPlaceholderText("Nombre del profesional")).toBeDefined();
    expect(screen.getByRole("button", { name: "Agregar profesional" })).toBeDefined();
  });

  it("debería mostrar franjas string, array y vacías",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([{
        id: "s-1",
        nombre: "Diego",
        activo: true,
        horarios: { lun: "09:00-19:00", mar: ["09:00-13:00", "15:00-20:00"], "mié": 123 },
      }]),
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    expect(screen.getByText("Diego")).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDefined();
    expect((document.querySelector('input[name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-19:00");
    expect((document.querySelector('input[name="mar"]') as HTMLInputElement).value)
      .toBe("09:00-13:00, 15:00-20:00");
    expect((document.querySelector('input[name="mié"]') as HTMLInputElement).value).toBe("");
  });

  it("debería mostrar el editor visual por profesional",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([{ id: "s-1", nombre: "Diego", activo: true, horarios: { lun: "09:00-19:00" } }]),
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    expect(screen.getByRole("switch", { name: /Lunes abierto/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Domingo abierto/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Copiar el lunes/ })).toBeDefined();
    expect(screen.getByText(/Lun 9 a 19/)).toBeDefined();
  });

  it("debería mostrar inactivos sin horarios",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([{ id: "s-2", nombre: "Ana", activo: false, horarios: null }]),
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    expect(screen.getByText("Inactivo")).toBeDefined();
    expect(screen.getByRole("button", { name: "Activar" })).toBeDefined();
    expect((document.querySelector('input[name="lun"]') as HTMLInputElement).value).toBe("");
  });

  it("no debería ofrecer eliminar a un profesional con historial",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([{
          id: "s-1",
          nombre: "Gisela",
          activo: true,
          horarios: { lun: "09:00-19:00" },
        }]),
        turnos: [{
          staff_id: "s-1",
          inicio: "2026-10-20T12:15:00.000Z",
          fin: "2026-10-20T13:00:00.000Z",
          estado: "cancelado",
        }],
      },
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDefined();
    expect(screen.getByText("Con historial: solo desactivar.")).toBeDefined();
  });

  it("debería avisar cuántos turnos próximos siguen agendados al desactivar",
  async () =>
  {
    const user = userEvent.setup();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setUTCHours(12, 0, 0, 0);
    window.confirm = vi.fn(() => false);
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([{
          id: "s-1",
          nombre: "Gisela",
          activo: true,
          horarios: { lun: "09:00-19:00" },
        }]),
        turnos: [{
          staff_id: "s-1",
          inicio: manana.toISOString(),
          fin: new Date(manana.getTime() + 3_600_000).toISOString(),
          estado: "confirmado",
        }],
      },
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());
    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("1 turno próximo"));
    expect(vi.mocked(cambiarEstadoStaff)).not.toHaveBeenCalled();
  });

  it("debería filtrar profesionales mientras se escribe", async () =>
  {
    const user = userEvent.setup();
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        { id: "s-1", nombre: "Diego", activo: true, horarios: null },
        { id: "s-2", nombre: "Ana", activo: true, horarios: null },
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    await user.type(screen.getByRole("searchbox", { name: "Buscar profesional por nombre" }), "ana");

    expect(screen.queryByText("Diego")).toBeNull();
    expect(screen.getByText("Ana")).toBeDefined();
  });

  it("debería invocar las acciones al enviar formularios",
  async () =>
  {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);
    mockData.mockResolvedValueOnce({
      data: dashboardBase([{ id: "s-1", nombre: "Diego", activo: true, horarios: { lun: "09:00-19:00" } }]),
      error: null,
      isDemo: false,
    } as never);

    render(await StaffPage());

    await user.type(screen.getByPlaceholderText("Nombre del profesional"), "María");
    await user.click(screen.getByRole("button", { name: "Agregar profesional" }));

    expect(vi.mocked(agregarStaff)).toHaveBeenCalledWith("María");

    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    expect(vi.mocked(actualizarHorariosStaff)).toHaveBeenCalledWith(
      "s-1", expect.objectContaining({ lun: "09:00-19:00" }));

    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(vi.mocked(cambiarEstadoStaff)).toHaveBeenCalledWith("s-1", false);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(vi.mocked(eliminarStaff)).toHaveBeenCalledWith("s-1");
  });
});
