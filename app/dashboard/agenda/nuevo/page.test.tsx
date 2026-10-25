import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

const HORARIOS = {
  lun: "08:00-22:00",
  mar: "08:00-22:00",
  mié: "08:00-22:00",
  jue: "08:00-22:00",
  vie: "08:00-22:00",
  sáb: "08:00-22:00",
  dom: "08:00-22:00",
};

function dashboardBase(overrides: Record<string, unknown> = {})
{
  return {
    negocio: {
      id: "neg-1",
      nombre: "Barbería",
      timezone: "America/Argentina/Buenos_Aires",
      pais: "ar",
      horarios: HORARIOS,
    },
    staff: [{ id: "staff-1", nombre: "Diego", horarios: HORARIOS, activo: true }],
    servicios: [
      { id: "serv-1", nombre: "Corte", duracion_min: 30, precio_base: 1000000,
        precio_promocional: null, sena_requerida: false, sena_porcentaje: 0, activo: true },
    ],
    asociaciones: [{ staffId: "staff-1", servicioId: "serv-1" }],
    clientes: [
      { id: "cli-1", nombre: "Juan Pérez", whatsapp: "+549110000001", email: "juan@ejemplo.com" },
    ],
    turnos: [],
    ...overrides,
  };
}

/** Recorre los pasos 1-3 hasta abrir el paso de datos. */
async function elegirTurno(user: ReturnType<typeof userEvent.setup>): Promise<void>
{
  await user.click(screen.getByRole("button", { name: "Diego" }));
  await user.click(screen.getByRole("button", { name: /Corte/ }));
  await user.click(screen.getAllByRole("button", { name: /Elegir día/ })[0]!);
  await user.click(screen.getAllByRole("button", { name: /^\d{2}:\d{2}$/ })[0]!);
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
    const user = userEvent.setup();

    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ clienteId: "cli-1" }) }));

    expect(screen.getByRole("heading", { name: "Nuevo turno" })).toBeDefined();
    expect(screen.getByText(/Cliente precargado/)).toBeDefined();

    await elegirTurno(user);

    expect((screen.getByLabelText("Cliente") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Juan Pérez");
    expect((screen.getByLabelText("WhatsApp") as HTMLInputElement).value).toBe("+549110000001");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value)
      .toBe("juan@ejemplo.com");
  });

  it("debería respetar la fecha de la query y ofrecer volver a la agenda",
  async () =>
  {
    const user = userEvent.setup();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const clave = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-` +
      `${String(manana.getDate()).padStart(2, "0")}`;

    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ fecha: clave }) }));

    expect(screen.getByRole("link", { name: "Volver a la agenda" }).getAttribute("href"))
      .toBe("/dashboard/agenda");

    await user.click(screen.getByRole("button", { name: "Diego" }));
    await user.click(screen.getByRole("button", { name: /Corte/ }));

    expect(screen.getByText(/Elegí la hora del/)).toBeDefined();
  });

  it("debería caer en la fecha de hoy con una fecha inválida",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null } as never);

    render(await NuevoTurnoPage({ searchParams: Promise.resolve({ fecha: "hoy" }) }));

    expect(screen.getByRole("heading", { name: "Nuevo turno" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Diego" })).toBeDefined();
  });

});
