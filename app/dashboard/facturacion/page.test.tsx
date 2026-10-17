import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import FacturacionPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("./actions", () =>
{
  return { activarPlan: vi.fn(), cancelarPlan: vi.fn() };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);
const mockServer = vi.mocked(getSupabaseServer);

/** Negocio con estado de suscripción dado. */
function stubFacturacion(negocio: unknown, demo = false): void
{
  mockServer.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: demo ? { id: "demo-id", email: "demo@turnomas.com" } : { id: "u-1", email: "a@b.com" } },
      }),
    },
  } as never);
  mockData.mockResolvedValueOnce({
    data: { negocio, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
    isDemo: demo,
  } as never);
}

describe("FacturacionPage",
() =>
{
  it("debería mostrar activar en ARS para Argentina",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      pais: "ar",
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await FacturacionPage());

    expect(screen.getByRole("heading", { name: "Facturación" })).toBeDefined();
    expect(screen.getByLabelText("Email de tu cuenta de MercadoPago")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
  });

  it("debería mostrar activar en USD para México",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      pais: "mx",
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await FacturacionPage());

    expect(screen.getByLabelText("Email de tu cuenta de MercadoPago")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
  });

  it("debería mostrar cancelar con plan activo",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    });

    render(await FacturacionPage());

    expect(screen.getByRole("button", { name: "Cancelar plan" })).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
  });

  it("debería avisar mora con gracia",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "past_due",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: new Date(Date.now() - 86_400_000).toISOString(),
    });

    render(await FacturacionPage());

    expect(screen.getByText("En mora (5 días de gracia)")).toBeDefined();
    expect(screen.getByLabelText("Email de tu cuenta de MercadoPago")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
  });

  it("debería ocultar acciones en la demo",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    }, true);

    render(await FacturacionPage());

    expect(screen.queryByRole("button", { name: "Cancelar plan" })).toBeNull();
    expect(screen.getByText("La demo no suscribe planes reales. Creá tu cuenta gratis para activar el tuyo."))
      .toBeDefined();
  });

  it("debería avisar retorno de MercadoPago con suscripcion=ok",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await FacturacionPage({ searchParams: Promise.resolve({ suscripcion: "ok" }) }));

    expect(screen.getByText("Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización."))
      .toBeDefined();
  });

  it("debería avisar el error de activación",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await FacturacionPage({
      searchParams: Promise.resolve({ error: "Falta configurar MP_ACCESS_TOKEN en el entorno." }),
    }));

    expect(screen.getByText("No pudimos iniciar la activación: Falta configurar MP_ACCESS_TOKEN en el entorno."))
      .toBeDefined();
  });

  it("debería mostrar el comprobante de la suscripción con botón para copiar",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      pais: "ar",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    });

    render(await FacturacionPage());

    expect(screen.getByText("pre-1")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar nro de comprobante" })).toBeDefined();
  });

  it("debería ocultar el comprobante sin suscripción",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      pais: "ar",
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await FacturacionPage());

    expect(screen.queryByText("Comprobante")).toBeNull();
  });
});
