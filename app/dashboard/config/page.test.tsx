import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConfigPage from "./page";
import
{
  actualizarGoogleMapsUrl,
  actualizarHorariosNegocio,
  actualizarNombreNegocio,
  actualizarPlantillaMensaje,
  actualizarPoliticaListaNegra,
  actualizarPoliticaRemarketing,
  actualizarPoliticaResenas,
  actualizarPoliticaRecordatorios,
  actualizarPoliticaSena,
  actualizarTimezoneNegocio,
  desconectarGoogleCalendar,
  desconectarMercadoPago,
} from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("./actions", () =>
{
  return {
    actualizarGoogleMapsUrl: vi.fn(),
    actualizarHorariosNegocio: vi.fn(),
    actualizarNombreNegocio: vi.fn(),
    actualizarPlantillaMensaje: vi.fn(),
    actualizarPoliticaListaNegra: vi.fn(),
    actualizarPoliticaRemarketing: vi.fn(),
    actualizarPoliticaResenas: vi.fn(),
    actualizarPoliticaRecordatorios: vi.fn(),
    actualizarPoliticaSena: vi.fn(),
    actualizarTimezoneNegocio: vi.fn(),
    desconectarGoogleCalendar: vi.fn(),
    desconectarMercadoPago: vi.fn(),
    solicitarEliminacionNegocio: vi.fn(),
    confirmarEliminacionNegocio: vi.fn(),
  };
});

vi.mock("next/navigation", () =>
{
  return { useRouter: () => ({ push: vi.fn() }) };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockServer = vi.mocked(getSupabaseServer);

/** Sesión no demo para la detección de lector. */
function sesionNoDemo(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueño@negocio.com" } } }) },
  } as never);
}

function negocioBase(overrides: Record<string, unknown> = {})
{
  return {
    id: "neg-1",
    nombre: "Barbería",
    pais: "ar",
    slug: "barberia",
    horarios: { lun: "08:00-22:00" },
    blacklist_umbral: 3,
    blacklist_penalidad: "blocked",
    sena_retencion_hs: 48,
    recordatorio_activo: true,
    recordatorio_hs: 12,
    resena_activa: true,
    resena_hs: 5,
    remarketing_activo: false,
    remarketing_dias: 10,
    timezone: "America/Mexico_City",
    google_maps_url: "https://www.google.com/maps/place/X",
    ...overrides,
  };
}

/** Dashboard + secretos mockeados. */
function stubConfig(negocio: unknown, secretos: unknown = null): void
{
  sesionNoDemo();
  mockData.mockResolvedValueOnce({
    data: { negocio, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
    isDemo: false,
  } as never);
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: secretos }),
        }),
      }),
    }),
  } as never);
}

describe("ConfigPage",
() =>
{
  it("debería mostrar secciones con valores del negocio",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678", google_refresh_token: "r" });

    render(await ConfigPage());

    expect(screen.getByRole("heading", { name: "Configuración" })).toBeDefined();
    expect(screen.getByText("Lista negra automática")).toBeDefined();
    expect(screen.getByText("Política de seña")).toBeDefined();
    expect(screen.getByText("Recordatorios automáticos")).toBeDefined();
    expect(screen.getByText("Reseñas")).toBeDefined();
    expect(screen.getAllByText("Remarketing").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Mensajes")).toBeDefined();
    expect(screen.getByText("Conexiones")).toBeDefined();
    expect(screen.getByText("Zona de peligro")).toBeDefined();
    expect((document.querySelector('input[name="umbral"]') as HTMLInputElement).value).toBe("3");
  });

  it("debería mostrar link público y mapas con reseñas activas",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage());

    expect(screen.getByRole("link", { name: "/ar/barberia" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Guardar link" })).toBeDefined();
  });

  it("debería ocultar mapas sin reseñas activas",
  async () =>
  {
    stubConfig(negocioBase({ resena_activa: false }));

    render(await ConfigPage());

    expect(screen.queryByRole("button", { name: "Guardar link" })).toBeNull();
  });

  it("debería mostrar conexiones activas",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678", google_refresh_token: "r" });

    render(await ConfigPage());

    expect(screen.getByText("Conectado ••••5678")).toBeDefined();
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Desconectar Google" })).toBeDefined();
  });

  it("debería mostrar conexiones pendientes sin secretos",
  async () =>
  {
    stubConfig(negocioBase(), null);

    render(await ConfigPage());

    expect(screen.getAllByText("Sin conectar").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "Conectar con MercadoPago" }))
      .toHaveAttribute("href", "/api/integrations/mercadopago/authorize");
    expect(screen.getByRole("link", { name: "Conectar con Google" }))
      .toHaveAttribute("href", "/api/integrations/google/authorize");
  });

  it("debería avisar conexión ok por ?mp=ok",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: Promise.resolve({ mp: "ok" }) }));

    expect(screen.getByText("MercadoPago conectado. Las señas se cobran directo en tu cuenta."))
      .toBeDefined();
  });

  it("debería ocultar el OAuth en la demo",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "demo-id", email: "demo@turnomas.com" } } }) },
    } as never);
    mockData.mockResolvedValueOnce({
      data: { negocio: negocioBase(), staff: [], servicios: [], clientes: [], turnos: [] },
      error: null,
      isDemo: true,
    } as never);
    mockAdmin.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null }),
          }),
        }),
      }),
    } as never);

    render(await ConfigPage());

    expect(screen.queryByRole("link", { name: "Conectar con MercadoPago" })).toBeNull();
    expect(screen.getByText("La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas con tu MercadoPago."))
      .toBeDefined();
  });

  it("debería tolerar negocio sin id y base caída",
  async () =>
  {
    stubConfig({ id: "neg-x", nombre: "Nuevo" });
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("db caída");
    });

    render(await ConfigPage());

    expect(screen.getByRole("heading", { name: "Configuración" })).toBeDefined();
    expect(screen.getAllByText("Sin conectar").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Tu página pública:")).toBeNull();
  });

  it("debería invocar las acciones al guardar cada sección",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678", google_refresh_token: "r" });

    render(await ConfigPage());

    await user.click(screen.getByRole("button", { name: "Guardar nombre" }));

    expect(vi.mocked(actualizarNombreNegocio)).toHaveBeenCalledWith("Barbería");

    await user.click(screen.getByRole("button", { name: "Guardar zona horaria" }));

    expect(vi.mocked(actualizarTimezoneNegocio)).toHaveBeenCalledWith("America/Mexico_City");

    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));

    expect(vi.mocked(actualizarHorariosNegocio)).toHaveBeenCalledWith(
      expect.objectContaining({ lun: "08:00-22:00" }));

    for (const boton of screen.getAllByRole("button", { name: "Guardar" }))
    {
      await user.click(boton);
    }

    expect(vi.mocked(actualizarPoliticaListaNegra)).toHaveBeenCalledWith(3, "blocked");
    expect(vi.mocked(actualizarPoliticaSena)).toHaveBeenCalledWith(48);
    expect(vi.mocked(actualizarPoliticaRecordatorios)).toHaveBeenCalledWith(true, 12);
    expect(vi.mocked(actualizarPoliticaResenas)).toHaveBeenCalledWith(true, 5);
    expect(vi.mocked(actualizarPoliticaRemarketing)).toHaveBeenCalledWith(false, 10);
    expect(vi.mocked(actualizarPlantillaMensaje)).toHaveBeenCalledTimes(4);

    await user.click(screen.getByRole("button", { name: "Guardar link" }));

    expect(vi.mocked(actualizarGoogleMapsUrl)).toHaveBeenCalledWith("https://www.google.com/maps/place/X");

    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    expect(vi.mocked(desconectarMercadoPago)).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Desconectar Google" }));

    expect(vi.mocked(desconectarGoogleCalendar)).toHaveBeenCalledOnce();
  });

  it("debería mostrar franjas en array",
  async () =>
  {
    stubConfig(negocioBase({ horarios: { lun: ["09:00-13:00", "15:00-20:00"] } }));

    render(await ConfigPage());

    expect((document.querySelector('input[name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-13:00, 15:00-20:00");
  });

  it("debería desconectar todo sin id de negocio",
  async () =>
  {
    stubConfig({ nombre: "Nuevo" });

    render(await ConfigPage());

    expect(screen.getAllByText("Sin conectar").length).toBeGreaterThanOrEqual(2);
  });

  it("debería mostrar las 4 plantillas de mensajes",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage());

    for (const titulo of ["Confirmación de reserva", "Pedido de reseña"])
    {
      expect(screen.getByText(titulo)).toBeDefined();
    }

    expect(screen.getAllByText("Recordatorio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Remarketing").length).toBeGreaterThanOrEqual(2);
  });
});
