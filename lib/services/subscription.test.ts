import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscriptionService } from "./subscription";
import { MpHttpError } from "@/lib/payments/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

/** Stub de update().eq() que captura valores. */
function stubUpdate(updates: unknown[] = [], error: { message?: string } | null = null)
{
  mockGetSupabaseAdmin.mockReturnValue({
    from: () => ({
      update: (values: unknown) =>
      {
        updates.push(values);

        return { eq: async () => ({ error }) };
      },
    }),
  } as never);
}

/** Stub de upsert() que captura fila y opciones. */
function stubUpsert(capturado: { valores?: unknown; opciones?: unknown } = {},
  error: { message?: string } | null = null)
{
  mockGetSupabaseAdmin.mockReturnValue({
    from: () => ({
      upsert: async (valores: unknown, opciones: unknown) =>
      {
        capturado.valores = valores;
        capturado.opciones = opciones;

        return { error };
      },
    }),
  } as never);
}

/** Stub de select().eq().order() que devuelve filas. */
function stubSelect(filas: unknown[], error: { message?: string } | null = null)
{
  mockGetSupabaseAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: filas, error }),
        }),
      }),
    }),
  } as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("subscriptionService.crearParaNegocio",
() =>
{
  it("debería crear la suscripción sin plan y devolver el init_point",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");
    const cuerpos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body?: unknown } = {}) =>
    {
      cuerpos.push(typeof init.body === "string" ? init.body : "");

      return { ok: true, json: async () => ({ id: "pre-1", status: "pending", init_point: "https://mp/checkout/pre-1" }) };
    }));

    const result = await subscriptionService.crearParaNegocio("neg-ar", "pagador@mp.com", "ar");

    expect(result).toEqual({ id: "pre-1", initPoint: "https://mp/checkout/pre-1", status: "pending" });

    const body = JSON.parse(cuerpos[0]) as Record<string, unknown>;

    expect(body).toMatchObject({
      external_reference: "neg-ar",
      payer_email: "pagador@mp.com",
      status: "pending",
      auto_recurring: { transaction_amount: 14999, currency_id: "ARS" },
      notification_url: "https://turnomas.com/api/webhooks/mercadopago",
    });
  });
});

/** Fetch mockeado que responde búsquedas por estado y captura las URLs. */
function instalarBusqueda(resultados: { authorized?: unknown[]; pending?: unknown[] })
{
  const urls: string[] = [];
  const fetchMock = vi.fn(async (url: string, init: { method?: string } = {}) =>
  {
    urls.push(`${init.method ?? "GET"} ${url}`);

    if (url.includes("status=authorized"))
    {
      return { ok: true, status: 200, json: async () => ({ results: resultados.authorized ?? [] }) };
    }

    if (url.includes("status=pending"))
    {
      return { ok: true, status: 200, json: async () => ({ results: resultados.pending ?? [] }) };
    }

    return { ok: true, status: 200, json: async () => ({}) };
  });

  vi.stubGlobal("fetch", fetchMock);

  return { fetchMock, urls };
}

describe("subscriptionService.reconciliar",
  () =>
  {
    it("debería activar con la autorizada más reciente y cancelar duplicadas",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      const { urls } = instalarBusqueda({
        authorized: [
          { id: "pre-a", status: "authorized", external_reference: "neg-1", last_modified: "2026-10-17T14:00:00.000Z" },
          { id: "pre-b", status: "authorized", external_reference: "neg-1", last_modified: "2026-10-17T13:00:00.000Z" },
          { id: "pre-otro", status: "authorized", external_reference: "neg-2", last_modified: "2026-10-18T00:00:00.000Z" },
        ],
        pending: [
          { id: "pre-p", status: "pending", external_reference: "neg-1", last_modified: "2026-10-17T15:00:00.000Z" },
        ],
      });

      const result = await subscriptionService.reconciliar("neg-1");

      expect(result).toEqual({ estado: "active", preapprovalId: "pre-a", initPoint: null });
      expect(updates).toEqual([{
        suscripcion_estado: "active",
        suscripcion_mp_id: "pre-a",
        suscripcion_mora_desde: null,
        suscripcion_cancelada_en: null,
      }]);
      expect(urls.filter((url) => url.startsWith("PUT "))).toEqual([
        "PUT https://api.mercadopago.com/preapproval/pre-b",
        "PUT https://api.mercadopago.com/preapproval/pre-p",
      ]);
    });

    it("debería devolver el init_point de la pendiente y cancelar las otras",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      const { urls } = instalarBusqueda({
        authorized: [],
        pending: [
          { id: "pre-p", status: "pending", external_reference: "neg-1", init_point: "https://mp/p", last_modified: "2026-10-17T15:00:00.000Z" },
          { id: "pre-q", status: "pending", external_reference: "neg-1", last_modified: "2026-10-17T10:00:00.000Z" },
        ],
      });

      const result = await subscriptionService.reconciliar("neg-1");

      expect(result).toEqual({ estado: "pending", preapprovalId: "pre-p", initPoint: "https://mp/p" });
      expect(updates).toEqual([]);
      expect(urls.filter((url) => url.startsWith("PUT "))).toEqual([
        "PUT https://api.mercadopago.com/preapproval/pre-q",
      ]);
    });

    it("debería devolver none sin suscripciones del negocio",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      instalarBusqueda({ authorized: [], pending: [] });

      await expect(subscriptionService.reconciliar("neg-1"))
        .resolves.toEqual({ estado: "none", preapprovalId: null, initPoint: null });
    });

    it("debería fallar sin MP_ACCESS_TOKEN",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "");

      await expect(subscriptionService.reconciliar("neg-1"))
        .rejects.toThrow("MP_ACCESS_TOKEN");
    });
  });

describe("subscriptionService.activarSuscripcion",
() =>
{
  it("debería guardar estado active con mp_id, vencimiento y limpiar la mora",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.activarSuscripcion("neg-1", "pre-1", "2026-11-01T00:00:00Z");

    expect(updates).toEqual([{
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: null,
      suscripcion_cancelada_en: null,
      suscripcion_vence_en: "2026-11-01T00:00:00Z",
    }]);
  });

  it("debería conservar el vencimiento previo cuando MP no lo informa",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.activarSuscripcion("neg-1", "pre-1");

    expect(updates).toEqual([{
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: null,
      suscripcion_cancelada_en: null,
    }]);
  });
});

describe("subscriptionService.marcarPastDue",
() =>
{
  it("debería guardar past_due con inicio de mora",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.marcarPastDue("neg-1", new Date("2026-10-01T00:00:00Z"));

    expect(updates).toEqual([{
      suscripcion_estado: "past_due",
      suscripcion_mora_desde: "2026-10-01T00:00:00.000Z",
    }]);
  });
});

describe("subscriptionService.cancelarParaNegocio",
  () =>
  {
    /** Fetch que rechaza el PUT de cancelación con el status indicado. */
    function fetchQueFalla(status: number): void
    {
      vi.stubGlobal("fetch", vi.fn(async () => ({
        ok: false,
        status,
        text: async () => "cancelación rechazada",
      })));
    }

    // Cancelación diferida: se conserva el acceso hasta el vencimiento.
    const CANCELACION_DIFERIDA = [{
      suscripcion_cancelada_en: "2026-10-18T00:00:00.000Z",
      suscripcion_estado: "active",
      suscripcion_vence_en: "2026-11-01T00:00:00Z",
    }];

    it("debería cancelar en MP y conservar el acceso hasta el vencimiento",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      vi.stubGlobal("fetch", vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: "pre-1", status: "canceled" }),
      })));

      await subscriptionService.cancelarParaNegocio(
        "neg-1", "pre-1", "2026-11-01T00:00:00Z", new Date("2026-10-18T00:00:00Z"));

      expect(updates).toEqual(CANCELACION_DIFERIDA);
    });

    it("debería conservar el acceso cuando MP ya la tenía cancelada (400)",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      fetchQueFalla(400);

      await subscriptionService.cancelarParaNegocio(
        "neg-1", "pre-1", "2026-11-01T00:00:00Z", new Date("2026-10-18T00:00:00Z"));

      expect(updates).toEqual(CANCELACION_DIFERIDA);
    });

    it("debería conservar el acceso cuando el preapproval no existe (404)",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      fetchQueFalla(404);

      await subscriptionService.cancelarParaNegocio(
        "neg-1", "pre-1", "2026-11-01T00:00:00Z", new Date("2026-10-18T00:00:00Z"));

      expect(updates).toEqual(CANCELACION_DIFERIDA);
    });

    it("debería propagar un fallo transitorio sin tocar el plan local",
    async () =>
    {
      vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
      const updates: unknown[] = [];
      stubUpdate(updates);
      fetchQueFalla(500);

      await expect(subscriptionService.cancelarParaNegocio(
        "neg-1", "pre-1", "2026-11-01T00:00:00Z", new Date("2026-10-18T00:00:00Z")))
        .rejects.toBeInstanceOf(MpHttpError);
      expect(updates).toEqual([]);
    });
  });

describe("subscriptionService.marcarCancelada",
  () =>
  {
    it("debería conservar el estado active con la fecha de cancelación y el vencimiento",
    async () =>
    {
      const updates: unknown[] = [];
      stubUpdate(updates);

      await subscriptionService.marcarCancelada(
        "neg-1", "2026-11-01T00:00:00Z", new Date("2026-10-18T00:00:00Z"));

      expect(updates).toEqual([{
        suscripcion_cancelada_en: "2026-10-18T00:00:00.000Z",
        suscripcion_estado: "active",
        suscripcion_vence_en: "2026-11-01T00:00:00Z",
      }]);
    });

    it("debería conservar el vencimiento previo sin fecha de MP",
    async () =>
    {
      const updates: unknown[] = [];
      stubUpdate(updates);

      await subscriptionService.marcarCancelada("neg-1", null, new Date("2026-10-18T00:00:00Z"));

      expect(updates).toEqual([{
        suscripcion_cancelada_en: "2026-10-18T00:00:00.000Z",
        suscripcion_estado: "active",
      }]);
    });
  });

describe("subscriptionService.cancelarSuscripcionLocal",
  () =>
  {
  it("debería limpiar mp_id y volver a blocked (el trial decide por fecha)",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.cancelarSuscripcionLocal("neg-1");

    expect(updates).toEqual([{
      suscripcion_estado: "blocked",
      suscripcion_mp_id: null,
      suscripcion_mora_desde: null,
    }]);
  });
});

describe("subscriptionService.resolverNegocioDeCobro",
() =>
{
  it("debería mapear por external_reference/preapproval_id del authorized payment",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    const urls: string[] = [];

    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    {
      urls.push(url);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 7033036606,
          status: "processed",
          external_reference: "neg-1",
          preapproval_id: "pre-1",
          payment: { id: 183627913945, status: "approved" },
          transaction_amount: "14999.00",
          currency_id: "ARS",
          debit_date: "2026-03-01T11:12:25.892-03:00",
        }),
      };
    }));

    const result = await subscriptionService.resolverNegocioDeCobro("7033036606");

    expect(result).toEqual({
      negocioId: "neg-1",
      preapprovalId: "pre-1",
      status: "approved",
      authorizedPaymentId: "7033036606",
      mpPaymentId: "183627913945",
      montoCents: 1499900,
      currency: "ARS",
      fecha: "2026-03-01T11:12:25.892-03:00",
    });
    expect(urls[0]).toContain("/authorized_payments/7033036606");
    expect(urls.some((url) => url.includes("/preapproval/search"))).toBe(false);
  });

  it("debería caer al email del pagador sin external_reference",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");

    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    {
      if (url.includes("/authorized_payments/"))
      {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "999", status: "recycling", payer: { email: "dueno@negocio.com" } }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [{ id: "pre-9", external_reference: "neg-9" }] }),
      };
    }));

    const result = await subscriptionService.resolverNegocioDeCobro("999");

    expect(result).toEqual({
      negocioId: "neg-9",
      preapprovalId: "pre-9",
      status: "rejected",
      authorizedPaymentId: "999",
      mpPaymentId: null,
      montoCents: null,
      currency: null,
      fecha: null,
    });
  });

  it("debería devolver null sin negocio ni email",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "999", status: "scheduled" }),
    })));

    await expect(subscriptionService.resolverNegocioDeCobro("999")).resolves.toBeNull();
  });
});

describe("subscriptionService.registrarPago",
() =>
{
  it("debería hacer upsert idempotente por authorized_payment_id",
  async () =>
  {
    const capturado: { valores?: unknown; opciones?: unknown } = {};
    stubUpsert(capturado);

    await subscriptionService.registrarPago({
      negocioId: "neg-1",
      preapprovalId: "pre-1",
      authorizedPaymentId: "auth-1",
      mpPaymentId: "pay-1",
      montoCents: 1499900,
      currency: "ARS",
      estado: "approved",
      fecha: "2026-03-01T11:12:25.892-03:00",
    });

    expect(capturado.valores).toEqual({
      negocio_id: "neg-1",
      preapproval_id: "pre-1",
      authorized_payment_id: "auth-1",
      mp_payment_id: "pay-1",
      monto_cents: 1499900,
      currency: "ARS",
      estado: "approved",
      fecha: "2026-03-01T11:12:25.892-03:00",
    });
    expect(capturado.opciones).toEqual({ onConflict: "authorized_payment_id" });
  });

  it("debería propagar el error de Supabase",
  async () =>
  {
    stubUpsert({}, { message: "boom" });

    await expect(subscriptionService.registrarPago({
      negocioId: "neg-1",
      preapprovalId: "pre-1",
      authorizedPaymentId: "auth-1",
      mpPaymentId: null,
      montoCents: 1500,
      currency: "USD",
      estado: "rejected",
      fecha: "2026-03-01T11:12:25.892-03:00",
    })).rejects.toThrow("No pudimos registrar el pago");
  });
});

describe("subscriptionService.listarPagos",
() =>
{
  it("debería mapear las cuotas del negocio",
  async () =>
  {
    stubSelect([
      {
        id: "pago-1",
        preapproval_id: "pre-1",
        authorized_payment_id: "auth-1",
        mp_payment_id: "pay-1",
        monto_cents: 1499900,
        currency: "ARS",
        estado: "approved",
        fecha: "2026-03-01T11:12:25.892-03:00",
      },
      {
        id: "pago-2",
        preapproval_id: "pre-1",
        authorized_payment_id: "auth-2",
        mp_payment_id: null,
        monto_cents: 1500,
        currency: "USD",
        estado: "rejected",
        fecha: "2026-04-01T11:12:25.892-03:00",
      },
    ]);

    const result = await subscriptionService.listarPagos("neg-1");

    expect(result).toEqual([
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
        montoCents: 1500,
        currency: "USD",
        estado: "rejected",
        fecha: "2026-04-01T11:12:25.892-03:00",
      },
    ]);
  });

  it("debería devolver lista vacía sin filas y descartar filas inválidas",
  async () =>
  {
    stubSelect([{ id: "incompleto" }]);

    await expect(subscriptionService.listarPagos("neg-1")).resolves.toEqual([]);
  });

  it("debería propagar el error de Supabase",
  async () =>
  {
    stubSelect([], { message: "boom" });

    await expect(subscriptionService.listarPagos("neg-1"))
      .rejects.toThrow("No pudimos cargar el historial");
  });
});
