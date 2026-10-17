import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscriptionService } from "./subscription";
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
      notification_url: "https://turnomas.com/api/webhooks",
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
      await expect(subscriptionService.reconciliar("neg-1"))
        .rejects.toThrow("MP_ACCESS_TOKEN");
    });
  });

describe("subscriptionService.activarSuscripcion",
() =>
{
  it("debería guardar estado active con mp_id y limpiar la mora",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.activarSuscripcion("neg-1", "pre-1");

    expect(updates).toEqual([{
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: null,
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
        }),
      };
    }));

    const result = await subscriptionService.resolverNegocioDeCobro("7033036606");

    expect(result).toEqual({ negocioId: "neg-1", preapprovalId: "pre-1", status: "approved" });
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

    expect(result).toEqual({ negocioId: "neg-9", preapprovalId: "pre-9", status: "rejected" });
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
