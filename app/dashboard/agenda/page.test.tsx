import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgendaPage from "./page";
import { actualizarEstadoTurno } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";
import { calendarService } from "@/lib/services/calendar";

vi.mock("./actions", () =>
{
  return { actualizarEstadoTurno: vi.fn() };
});

vi.mock("./actions", () =>
{
  return { actualizarEstadoTurno: vi.fn() };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/lib/services/calendar", () =>
{
  return { calendarService: { getExternalEventsForNegocio: vi.fn(async () => []) } };
});

vi.mock("next/navigation", () =>
{
  return { usePathname: () => "/dashboard/agenda" };
});

const mockData = vi.mocked(getDashboardData);
const mockExternos = vi.mocked(calendarService.getExternalEventsForNegocio);

function turnoBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    staff_id: "staff-1",
    servicio_id: "serv-1",
    cliente_id: "cli-1",
    inicio: "2026-10-06T10:00:00-03:00",
    fin: "2026-10-06T10:30:00-03:00",
    estado: "pendiente",
    sena_monto: 5000,
    sena_porcentaje: 50,
    ...overrides,
  };
}

function dashboardBase(turnos: unknown[] = [turnoBase()])
{
  return {
    negocio: {
      id: "neg-1",
      nombre: "Barbería",
      timezone: "America/Argentina/Buenos_Aires",
      pais: "ar",
    },
    staff: [{ id: "staff-1", nombre: "Diego" }],
    servicios: [{ id: "serv-1", nombre: "Corte", duracion_min: 30 }],
    clientes: [{ id: "cli-1", nombre: "Juan", whatsapp: "+5491112345678" }],
    turnos,
  };
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("AgendaPage",
() =>
{
  it("debería mostrar pendiente con marcar seña y cancelar",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await AgendaPage());

    expect(screen.getByRole("heading", { name: "Agenda" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Marcar seña pagada" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });

  it("debería mostrar completar, ausente y WhatsApp en confirmado",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ estado: "confirmado" })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByRole("button", { name: "Completar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ausente" })).toBeDefined();
    const wa = screen.getByRole("link", { name: "WhatsApp" });

    expect(wa.getAttribute("href")).toContain("wa.me/5491112345678");
  });

  it("debería mostrar WhatsApp de reseña en completado con base",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ estado: "completado" })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    const wa = screen.getByRole("link", { name: "WhatsApp" });

    expect(wa.getAttribute("href")).toContain("wa.me/5491112345678");
  });

  it("debería avisar sin turnos del profesional",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByText("Sin turnos para este profesional.")).toBeDefined();
  });

  it("debería mapear eventos externos de Google",
  async () =>
  {
    mockExternos.mockResolvedValueOnce([{
      id: "e-1",
      titulo: "Dentista",
      descripcion: null,
      inicio: new Date("2026-10-06T16:00:00-03:00"),
      fin: new Date("2026-10-06T17:00:00-03:00"),
    }]);
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ estado: "confirmado" })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage({ searchParams: Promise.resolve({ fecha: "2026-10-06" }) }));

    expect(screen.getByTitle("Google · Dentista")).toBeDefined();
  });

  it("debería tolerar fallas de Google",
  async () =>
  {
    mockExternos.mockRejectedValueOnce(new Error("gcal caído"));
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ estado: "confirmado" })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByRole("heading", { name: "Agenda" })).toBeDefined();
  });

  it("debería calcular el fin con la duración del servicio",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ estado: "confirmado", fin: null })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage({ searchParams: Promise.resolve({ fecha: "2026-10-06" }) }));

    expect(screen.getByTitle("Juan · Corte")).toBeDefined();
  });

  it("debería omitir WhatsApp sin número del cliente",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([turnoBase({ estado: "confirmado" })]),
        clientes: [{ id: "cli-1", nombre: "Juan" }],
      },
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByRole("button", { name: "Completar" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });

  it("debería usar plantillas personalizadas del negocio",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([turnoBase({ estado: "confirmado" })]),
        negocio: {
          id: "neg-1",
          nombre: "Barbería",
          timezone: "America/Argentina/Buenos_Aires",
          pais: "ar",
          msg_recordatorio_subject: "Hola {negocio}",
          msg_recordatorio_cuerpo: "Te esperamos {fecha}",
        },
      },
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByRole("link", { name: "WhatsApp" })).toBeDefined();
  });

  it("debería mostrar seña sin porcentaje",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ sena_porcentaje: null })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByText(/Seña \$/)).toBeDefined();
    expect(screen.queryByText(/\(50%\)/)).toBeNull();
  });

  it("debería omitir la seña cuando es nula",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ sena_monto: null, sena_porcentaje: null })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.queryByText(/Seña \$/)).toBeNull();
  });

  it("debería mostrar Devuelta cuando la seña fue reembolsada",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([turnoBase({ sena_reembolsada: true })]),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());

    expect(screen.getByText(/· Devuelta/)).toBeDefined();
  });

  it("debería cambiar estado al enviar el formulario",
  async () =>
  {
    const user = userEvent.setup();
    const mockCambiar = vi.mocked(actualizarEstadoTurno);
    mockData.mockResolvedValueOnce({
      data: dashboardBase(),
      error: null,
      isDemo: false,
    } as never);

    render(await AgendaPage());
    await user.click(screen.getByRole("button", { name: "Marcar seña pagada" }));

    expect(mockCambiar).toHaveBeenCalledWith("t-1", "pagado");
  });
});
