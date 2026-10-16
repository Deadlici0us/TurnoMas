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
  it("debería crear la suscripción AR sobre el plan con la tarjeta tokenizada",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");
    vi.stubEnv("MP_PLAN_ID_AR", "plan-ar-1");
    const cuerpos: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body?: unknown } = {}) =>
    {
      cuerpos.push(typeof init.body === "string" ? init.body : "");

      return { ok: true, json: async () => ({ id: "pre-1", status: "authorized" }) };
    }));

    const result = await subscriptionService.crearParaNegocio("neg-ar", "pagador@mp.com", "ar", "card-tok-1");

    expect(result).toEqual({ id: "pre-1", status: "authorized" });

    const body = JSON.parse(cuerpos[0]) as Record<string, unknown>;

    expect(body).toMatchObject({
      preapproval_plan_id: "plan-ar-1",
      card_token_id: "card-tok-1",
      payer_email: "pagador@mp.com",
      status: "authorized",
    });
  });

  it("debería rechazar países sin plan configurado",
  async () =>
  {
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");

    await expect(subscriptionService.crearParaNegocio("neg-mx", "c@d.com", "mx", "card-tok-1"))
      .rejects.toThrow("El plan de pago no está configurado para este país.");
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
