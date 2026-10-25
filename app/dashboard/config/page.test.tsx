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
  desconectarMercadoPago,
} from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("./actions", () =>
{
  return {
    actualizarDescripcionNegocio: vi.fn(),
    actualizarGoogleMapsUrl: vi.fn(),
    actualizarGooglePlaceId: vi.fn(),
    actualizarHorariosNegocio: vi.fn(),
    actualizarLogoNegocio: vi.fn(),
    actualizarNombreNegocio: vi.fn(),
    actualizarPlantillaMensaje: vi.fn(),
    actualizarPoliticaListaNegra: vi.fn(),
    actualizarPoliticaRemarketing: vi.fn(),
    actualizarPoliticaResenas: vi.fn(),
    actualizarPoliticaRecordatorios: vi.fn(),
    actualizarPoliticaSena: vi.fn(),
    actualizarTimezoneNegocio: vi.fn(),
    actualizarWhatsappNegocio: vi.fn(),
    desconectarMercadoPago: vi.fn(),
    solicitarEliminacionNegocio: vi.fn(),
    confirmarEliminacionNegocio: vi.fn(),
    subirLogoNegocio: vi.fn(),
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

/** Sesión para la detección de lector. */
function sesionAutenticada(): void
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
  sesionAutenticada();
  mockData.mockResolvedValueOnce({
    data: { negocio, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
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

function seccionParams(seccion: string, mp?: string)
{
  return Promise.resolve({ seccion, ...(mp === undefined ? {} : { mp }) });
}

describe("ConfigPage",
() =>
{
  it("debería mostrar solo General por defecto",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage());

    expect(screen.getByRole("heading", { name: "Configuración" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Tu negocio" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Tu WhatsApp" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Tus horarios" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Tus mensajes" })).toBeNull();
    expect(screen.getByRole("link", { name: "Mensajes" }).getAttribute("href"))
      .toBe("/dashboard/config?seccion=mensajes");
  });

  it("debería mostrar Horarios y avisos",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("horarios") }));

    expect(screen.getByRole("heading", { name: "Tus horarios" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Avisos antes del turno" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Pedir opiniones" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Tu negocio" })).toBeNull();
  });

  it("debería mostrar Clientes con la política de faltas",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("clientes") }));

    expect(screen.getByRole("heading", { name: "Si un cliente falta" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Remarketing" })).toBeDefined();
    expect(screen.getByText("Si un cliente falta 3 veces, no lo dejamos reservar más.")).toBeDefined();
    expect((document.querySelector('input[name="umbral"]') as HTMLInputElement).value).toBe("3");
  });

  it("debería mostrar Cobros con seña y conexiones",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    expect(screen.getByRole("heading", { name: "Cómo cuidás la seña" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cómo cobrás" })).toBeDefined();
    expect(screen.getByText(/Si cancela faltando más de 48 hs/)).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Si un cliente falta" })).toBeNull();
  });

  it("debería mostrar link público y la ubicación de Google Maps",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("general") }));

    expect(screen.getByRole("link", { name: "/ar/barberia" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Guardar ubicación" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Guardar descripción" })).toBeDefined();
    expect(screen.getByText("Logo de tu negocio")).toBeDefined();
  });

  it("debería mostrar la ubicación aunque las reseñas estén apagadas",
  async () =>
  {
    stubConfig(negocioBase({ resena_activa: false }));

    render(await ConfigPage({ searchParams: seccionParams("general") }));

    expect(screen.getByRole("button", { name: "Guardar ubicación" })).toBeDefined();
  });

  it("debería mostrar conexiones activas",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    expect(screen.getByText("Listo ••••5678")).toBeDefined();
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeDefined();
  });

  it("debería mostrar conexiones pendientes sin secretos",
  async () =>
  {
    stubConfig(negocioBase(), null);

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    expect(screen.getAllByText("Falta conectar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Conectar MercadoPago" }))
      .toHaveAttribute("href", "/api/integrations/mercadopago/authorize");
  });

  it("debería avisar conexión ok por ?mp=ok",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: Promise.resolve({ mp: "ok" }) }));

    expect(screen.getByText("MercadoPago conectado. Las señas se cobran directo en tu cuenta."))
      .toBeDefined();
  });

  it("debería avisar seña activa por ?mp=sena-activa en vez de error 500",
  async () =>
  {
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: Promise.resolve({ mp: "sena-activa" }) }));

    expect(screen.getByText("Tenés servicios con seña activa. Desactivalas en Servicios y volvé a desconectar."))
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

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    expect(screen.getByRole("heading", { name: "Configuración" })).toBeDefined();
    expect(screen.getAllByText("Falta conectar").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Tu link para compartir:")).toBeNull();
  });

  it("debería guardar los datos generales del negocio",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("general") }));

    await user.click(screen.getByRole("button", { name: "Guardar nombre" }));
    expect(vi.mocked(actualizarNombreNegocio)).toHaveBeenCalledWith("Barbería");

    await user.click(screen.getByRole("button", { name: "Guardar ciudad" }));
    expect(vi.mocked(actualizarTimezoneNegocio)).toHaveBeenCalledWith("America/Mexico_City");

    await user.click(screen.getByRole("button", { name: "Guardar ubicación" }));
    expect(vi.mocked(actualizarGoogleMapsUrl)).toHaveBeenCalledWith("https://www.google.com/maps/place/X");
  });

  it("debería guardar horarios y avisos",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("horarios") }));

    await user.click(screen.getByRole("button", { name: "Guardar horarios" }));
    expect(vi.mocked(actualizarHorariosNegocio)).toHaveBeenCalledWith(
      expect.objectContaining({ lun: "08:00-22:00" }));

    for (const boton of screen.getAllByRole("button", { name: "Guardar" }))
    {
      await user.click(boton);
    }

    expect(vi.mocked(actualizarPoliticaRecordatorios)).toHaveBeenCalledWith(true, 12);
    expect(vi.mocked(actualizarPoliticaResenas)).toHaveBeenCalledWith(true, 5);
  });

  it("debería guardar clientes y remarketing",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("clientes") }));

    for (const boton of screen.getAllByRole("button", { name: "Guardar" }))
    {
      await user.click(boton);
    }

    expect(vi.mocked(actualizarPoliticaListaNegra)).toHaveBeenCalledWith(3, "blocked");
    expect(vi.mocked(actualizarPoliticaRemarketing)).toHaveBeenCalledWith(false, 10);
  });

  it("debería guardar cobros y desconectar integraciones",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase(), { mercadopago_access_token: "APP_USR-12345678" });

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    for (const boton of screen.getAllByRole("button", { name: "Guardar" }))
    {
      await user.click(boton);
    }

    expect(vi.mocked(actualizarPoliticaSena)).toHaveBeenCalledWith(48);

    await user.click(screen.getByRole("button", { name: "Desconectar" }));
    expect(vi.mocked(desconectarMercadoPago)).toHaveBeenCalledOnce();
  });

  it("debería guardar las 4 plantillas de mensajes",
  async () =>
  {
    const user = userEvent.setup();
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("mensajes") }));

    for (const boton of screen.getAllByRole("button", { name: "Guardar" }))
    {
      await user.click(boton);
    }

    expect(vi.mocked(actualizarPlantillaMensaje)).toHaveBeenCalledTimes(4);
  });

  it("debería mostrar franjas en array",
  async () =>
  {
    stubConfig(negocioBase({ horarios: { lun: ["09:00-13:00", "15:00-20:00"] } }));

    render(await ConfigPage({ searchParams: seccionParams("horarios") }));

    expect((document.querySelector('input[type="hidden"][name="lun"]') as HTMLInputElement).value)
      .toBe("09:00-13:00, 15:00-20:00");
  });

  it("debería mostrar el editor visual con switches y sliders",
  async () =>
  {
    stubConfig(negocioBase({ horarios: { lun: "09:00-19:00", dom: "" } }));

    render(await ConfigPage({ searchParams: seccionParams("horarios") }));

    expect(screen.getByRole("switch", { name: /Lunes abierto/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Domingo abierto/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Trabajo de corrido 9 a 19/ })).toBeDefined();
    expect(screen.getByText(/Lun 9 a 19/)).toBeDefined();
  });

  it("debería desconectar todo sin id de negocio",
  async () =>
  {
    stubConfig({ nombre: "Nuevo" });

    render(await ConfigPage({ searchParams: seccionParams("cobros") }));

    expect(screen.getAllByText("Falta conectar").length).toBeGreaterThanOrEqual(1);
  });

  it("debería mostrar las 4 plantillas de mensajes",
  async () =>
  {
    stubConfig(negocioBase());

    render(await ConfigPage({ searchParams: seccionParams("mensajes") }));

    for (const titulo of ["Cuando alguien reserva", "Después del turno: pedir opinión"])
    {
      expect(screen.getByText(titulo)).toBeDefined();
    }

    expect(screen.getByText("Un día antes del turno")).toBeDefined();
    expect(screen.getByText("Mensaje de remarketing")).toBeDefined();
    expect(screen.getByPlaceholderText(/Hola \{cliente\}, te esperamos mañana \{fecha\}/)).toBeDefined();
    expect(screen.getByPlaceholderText(/cancelá tu turno acá: \{link_cancelacion\}/)).toBeDefined();
    expect(screen.queryByPlaceholderText(/Ej: Hola \{negocio\}/)).toBeNull();
    expect(screen.getAllByText(
      /\{cliente\} \{negocio\} \{servicio\} \{profesional\} \{fecha\} \{link_cancelacion\}/).length)
      .toBeGreaterThanOrEqual(1);
  });
});
