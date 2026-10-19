import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ClientesPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";

vi.mock("./actions", () =>
{
  return {
    crearCliente: vi.fn(),
    ajustarAusencia: vi.fn(),
    cambiarBloqueoCliente: vi.fn(),
    eliminarCliente: vi.fn(),
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
      blacklist_umbral: 2,
      blacklist_penalidad: "fullDeposit",
    },
    staff: [],
    servicios: [{ id: "serv-1", nombre: "Corte" }],
    clientes,
    turnos,
  };
}

function params(q?: string, filtro?: string)
{
  return Promise.resolve({ ...(q === undefined ? {} : { q }), ...(filtro === undefined ? {} : { filtro }) });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("ClientesPage",
() =>
{
  it("debería mostrar stats y filas",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getByRole("heading", { name: "Clientes" })).toBeDefined();
    expect(screen.getAllByText("Juan Pérez").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Activo").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });

  it("debería ofrecer agregar un turno con los datos del cliente",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await ClientesPage({ searchParams: params() }));

    const links = screen.getAllByRole("link", { name: "Agregar turno" });

    expect(links[0]?.getAttribute("href")).toBe("/dashboard/agenda/nuevo?clienteId=cli-1");
  });

  it("debería marcar bloqueados manualmente",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase({ bloqueado: true })]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getAllByText("Bloqueado").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Desbloquear").length).toBeGreaterThanOrEqual(2);
  });

  it("debería marcar seña 100% por ausencias",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase({ ausencias: 3 })]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getAllByText("Seña 100%").length).toBeGreaterThanOrEqual(2);
  });

  it("debería filtrar solo activos",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        clienteBase({ id: "cli-1", nombre: "Juan" }),
        clienteBase({ id: "cli-2", nombre: "Ana", bloqueado: true }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params(undefined, "activos") }));

    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.getAllByText("Juan").length).toBeGreaterThanOrEqual(2);
  });

  it("debería filtrar solo lista negra",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        clienteBase({ id: "cli-1", nombre: "Juan" }),
        clienteBase({ id: "cli-2", nombre: "Ana", bloqueado: true }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params(undefined, "lista-negra") }));

    expect(screen.getAllByText("Ana").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Juan")).toBeNull();
  });

  it("debería buscar por nombre y whatsapp",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        clienteBase({ id: "cli-1", nombre: "Juan" }),
        clienteBase({ id: "cli-2", nombre: "Ana", whatsapp: "+5491199999999" }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    const { unmount } = render(await ClientesPage({ searchParams: params("ana") }));

    expect(screen.queryByText("Juan")).toBeNull();
    expect(screen.getAllByText("Ana").length).toBeGreaterThanOrEqual(2);
    unmount();

    mockData.mockResolvedValueOnce({
      data: dashboardBase([
        clienteBase({ id: "cli-1", nombre: "Juan", whatsapp: "+5491112345678" }),
        clienteBase({ id: "cli-2", nombre: "Ana", whatsapp: "+5491199999999" }),
      ]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params("9999") }));

    expect(screen.queryByText("Juan")).toBeNull();
  });

  it("debería enlazar el nombre a la ficha del cliente",
  async () =>
  {
    mockData.mockResolvedValueOnce({ data: dashboardBase(), error: null, isDemo: false } as never);

    render(await ClientesPage({ searchParams: params() }));

    const links = screen.getAllByRole("link", { name: "Juan Pérez" });

    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]?.getAttribute("href")).toBe("/dashboard/clientes/cli-1");
  });

  it("debería avisar sin coincidencias y sin clientes",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase({ nombre: "Juan" })]),
      error: null,
      isDemo: false,
    } as never);

    const { unmount } = render(await ClientesPage({ searchParams: params("zzz") }));

    expect(screen.getByText("Ningún cliente coincide con la búsqueda.")).toBeDefined();
    unmount();

    mockData.mockResolvedValueOnce({
      data: dashboardBase([]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getByText("Todavía no tenés clientes.")).toBeDefined();
  });

  it("debería mostrar último turno y WhatsApp con portal",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockData.mockResolvedValueOnce({
      data: dashboardBase([clienteBase()], [{
        id: "t-1",
        cliente_id: "cli-1",
        servicio_id: "serv-1",
        inicio: "2026-10-05T14:00:00.000Z",
        estado: "completado",
      }]),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getAllByText(/Último: Corte/).length).toBeGreaterThanOrEqual(1);
    const wa = screen.getAllByRole("link", { name: "WhatsApp" });

    expect(wa.length).toBeGreaterThanOrEqual(2);
    expect(wa[0]?.getAttribute("href")).toContain("wa.me/5491112345678");
  });

  it("debería usar umbral 2 sin configuración",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([clienteBase({ ausencias: 2 })]),
        negocio: { id: "neg-1", nombre: "Barbería" },
      },
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getAllByText("Seña 100%").length).toBeGreaterThanOrEqual(2);
  });

  it("debería usar plantillas de remarketing personalizadas",
  async () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.turnomas.com");
    mockData.mockResolvedValueOnce({
      data: {
        ...dashboardBase([clienteBase()], [{
          id: "t-1",
          cliente_id: "cli-1",
          servicio_id: "serv-1",
          inicio: "2026-10-05T14:00:00.000Z",
          estado: "completado",
        }]),
        negocio: {
          id: "neg-1",
          nombre: "Barbería",
          pais: "ar",
          slug: "barberia",
          blacklist_umbral: 2,
          msg_remarketing_subject: "Volvé {negocio}",
          msg_remarketing_cuerpo: "Te extrañamos",
        },
      },
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getAllByRole("link", { name: "WhatsApp" }).length).toBeGreaterThanOrEqual(2);
  });

  it("debería mostrar Sin turnos sin historial",
  async () =>
  {
    mockData.mockResolvedValueOnce({
      data: dashboardBase(),
      error: null,
      isDemo: false,
    } as never);

    render(await ClientesPage({ searchParams: params() }));

    expect(screen.getByText("Sin turnos")).toBeDefined();
  });
});
