import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SuscripcionPage from "./page";
import { getDashboardData } from "@/lib/dashboard/queries";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("./actions", () =>
{
  return { cancelarPlan: vi.fn() };
});

vi.mock("@/lib/dashboard/queries", () =>
{
  return { getDashboardData: vi.fn() };
});

vi.mock("@/lib/services/subscription", () =>
{
  return { subscriptionService: { reconciliar: vi.fn(), listarPagos: vi.fn() } };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const mockData = vi.mocked(getDashboardData);
const mockServer = vi.mocked(getSupabaseServer);
const mockReconciliar = vi.mocked(subscriptionService.reconciliar);
const mockListarPagos = vi.mocked(subscriptionService.listarPagos);

/** Negocio con estado de suscripción dado. */
function stubFacturacion(negocio: unknown, demo = false): Record<string, unknown>
{
  const fila = { id: "neg-1", ...(negocio as Record<string, unknown>) };

  mockServer.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: demo ? { id: "demo-id", email: "demo@turnomas.com" } : { id: "u-1", email: "a@b.com" } },
      }),
    },
  } as never);
  mockData.mockResolvedValueOnce({
    data: { negocio: fila, staff: [], servicios: [], clientes: [], turnos: [] },
    error: null,
    isDemo: demo,
  } as never);

  return fila;
}

beforeEach(() =>
{
  vi.clearAllMocks();
  mockReconciliar.mockResolvedValue({ estado: "none", preapprovalId: null, initPoint: null });
  mockListarPagos.mockResolvedValue([]);
});

describe("SuscripcionPage",
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

    render(await SuscripcionPage());

    expect(screen.getByRole("heading", { name: "Suscripción" })).toBeDefined();
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

    render(await SuscripcionPage());

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

    render(await SuscripcionPage());

    expect(screen.getByRole("button", { name: "Cancelar plan" })).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
  });

  it("debería avisar mora dentro del margen",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "past_due",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: new Date(Date.now() - 3_600_000).toISOString(),
    });

    render(await SuscripcionPage());

    expect(screen.getByText("En mora")).toBeDefined();
    expect(screen.getByLabelText("Email de tu cuenta de MercadoPago")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
  });

  it("debería ocultar el formulario cuando el acceso está bloqueado",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      pais: "ar",
      suscripcion_estado: null,
      suscripcion_mp_id: null,
    });

    render(await SuscripcionPage());

    expect(screen.getByText("Bloqueado")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Pagar con MercadoPago" })).toBeNull();
    expect(screen.getByText("Completá el pago en el aviso para reactivar tu plan.")).toBeDefined();
  });

  it("debería ocultar acciones en la demo",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    }, true);

    render(await SuscripcionPage());

    expect(screen.queryByRole("button", { name: "Cancelar plan" })).toBeNull();
    expect(screen.getByText("La demo no suscribe planes reales. Creá tu cuenta gratis para activar el tuyo."))
      .toBeDefined();
  });

  it("debería avisar retorno de MercadoPago con suscripcion=ok",
  async () =>
  {
    const fila = stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });
    mockData.mockResolvedValue({
      data: { negocio: fila, staff: [], servicios: [], clientes: [], turnos: [] },
      error: null,
      isDemo: false,
    } as never);

    render(await SuscripcionPage({ searchParams: Promise.resolve({ suscripcion: "ok" }) }));

    expect(mockReconciliar).toHaveBeenCalledWith("neg-1");
    expect(screen.getByText("Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización."))
      .toBeDefined();
  });

  it("debería reconciliar al volver con la URL malformada de MercadoPago",
  async () =>
  {
    const fila = stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });
    mockData.mockResolvedValue({
      data: { negocio: fila, staff: [], servicios: [], clientes: [], turnos: [] },
      error: null,
      isDemo: false,
    } as never);

    render(await SuscripcionPage({
      searchParams: Promise.resolve({
        suscripcion: "ok?preapproval_id=c9d413fe3d2a465f88d28b2be92993a4",
      }),
    }));

    expect(mockReconciliar).toHaveBeenCalledWith("neg-1");
    expect(screen.getByRole("button", { name: "Ya pagué, verificar ahora" })).toBeDefined();
  });

  it("debería mostrar el plan activo sin aviso cuando la reconciliación lo activó",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });
    mockData.mockResolvedValue({
      data: {
        negocio: { id: "neg-1", created_at: "2026-01-01T00:00:00Z", suscripcion_estado: "active", suscripcion_mp_id: "pre-9" },
        staff: [],
        servicios: [],
        clientes: [],
        turnos: [],
      },
      error: null,
      isDemo: false,
    } as never);

    render(await SuscripcionPage({ searchParams: Promise.resolve({ suscripcion: "ok" }) }));

    expect(mockReconciliar).toHaveBeenCalledWith("neg-1");
    expect(screen.getByText("Activo")).toBeDefined();
    expect(screen.queryByText("Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ya pagué, verificar ahora" })).toBeNull();
  });

  it("no debería reconciliar al entrar sin retorno de MercadoPago",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await SuscripcionPage());

    expect(mockReconciliar).not.toHaveBeenCalled();
  });

  it("debería avisar el error de activación",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await SuscripcionPage({
      searchParams: Promise.resolve({ error: "Falta configurar MP_ACCESS_TOKEN en el entorno." }),
    }));

    expect(screen.getByText("No pudimos iniciar la activación: Falta configurar MP_ACCESS_TOKEN en el entorno."))
      .toBeDefined();
  });

  it("debería listar el historial de pagos con fecha, monto y comprobante",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      pais: "ar",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    });
    mockListarPagos.mockResolvedValueOnce([
      {
        id: "pago-1",
        preapprovalId: "pre-1",
        authorizedPaymentId: "auth-1",
        mpPaymentId: "pay-1",
        montoCents: 1499900,
        currency: "ARS",
        estado: "approved",
        fecha: "2026-03-01T11:12:25.892-03:00",
      },
      {
        id: "pago-2",
        preapprovalId: "pre-1",
        authorizedPaymentId: "auth-2",
        mpPaymentId: null,
        montoCents: 1499900,
        currency: "ARS",
        estado: "rejected",
        fecha: "2026-04-01T11:12:25.892-03:00",
      },
    ]);

    render(await SuscripcionPage());

    expect(mockListarPagos).toHaveBeenCalledWith("neg-1");
    expect(screen.getByRole("heading", { name: "Historial de pagos" })).toBeDefined();
    expect(screen.getByText("pay-1")).toBeDefined();
    expect(screen.getByRole("button", { name: "Copiar nro de comprobante" })).toBeDefined();
    expect(screen.getByText("Pagado")).toBeDefined();
    expect(screen.getByText("Rechazado")).toBeDefined();
  });

  it("debería mostrar el estado vacío sin pagos registrados",
  async () =>
  {
    stubFacturacion({
      created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      pais: "ar",
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
    });

    render(await SuscripcionPage());

    expect(screen.getByText("Todavía no hay pagos registrados.")).toBeDefined();
  });

  it("no debería consultar pagos en la demo",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
    }, true);

    render(await SuscripcionPage());

    expect(mockListarPagos).not.toHaveBeenCalled();
    expect(screen.getByText("Todavía no hay pagos registrados.")).toBeDefined();
  });

  it("debería mostrar los días restantes de un plan activo",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_vence_en: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    });

    render(await SuscripcionPage());

    expect(screen.getByText("Activo")).toBeDefined();
    expect(screen.getByText(/Se renueva en \d+ días\./)).toBeDefined();
  });

  it("debería conservar el acceso y ofrecer reactivar tras cancelar",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_vence_en: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      suscripcion_cancelada_en: "2026-06-01T00:00:00Z",
    });

    render(await SuscripcionPage());

    expect(screen.getByText("Cancelado")).toBeDefined();
    expect(screen.getByText(/Conservá|Seguís con acceso/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar con MercadoPago" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Cancelar plan" })).toBeNull();
  });

  it("debería bloquear cuando la suscripción cancelada ya venció",
  async () =>
  {
    stubFacturacion({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_vence_en: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      suscripcion_cancelada_en: "2026-06-01T00:00:00Z",
    });

    render(await SuscripcionPage());

    expect(screen.getByText("Bloqueado")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Pagar con MercadoPago" })).toBeNull();
  });
});
