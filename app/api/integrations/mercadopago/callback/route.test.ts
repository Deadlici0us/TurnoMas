import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { codificarMpState, exchangeMpCodeForTokens } from "@/lib/payments/mp-oauth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

vi.mock("@/lib/payments/mp-oauth", async (importOriginal) =>
{
  const original = await importOriginal<typeof import("@/lib/payments/mp-oauth")>();

  return { ...original, exchangeMpCodeForTokens: vi.fn() };
});

const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockExchange = vi.mocked(exchangeMpCodeForTokens);

const URL_BASE = "http://localhost/api/integrations/mercadopago/callback";

function callbackUrl(params: string): string
{
  return `${URL_BASE}?${params}`;
}

/** URL de callback con `state` codificado. */
function callbackState(code: string, negocioId: string, next: string | null = null): string
{
  return callbackUrl(`code=${code}&state=${codificarMpState({ negocioId, next })}`);
}

/** Sesión de dueño autenticado no demo. */
function sesionDueno(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueño@negocio.com" } } }) },
  } as never);
}

/**
 * Stub del admin para el callback.
 *
 * @param negocio Fila del negocio dueño del state.
 * @param upsertError Error del upsert o null.
 * @param upserts Valores capturados por upsert().
 */
function stubCallback(negocio: unknown, upsertError: { message?: string } | null = null, upserts: unknown[] = [])
{
  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: async () => ({ data: tabla === "negocios" ? negocio : null }),
          })),
          single: async () => ({ data: tabla === "negocios" ? negocio : null }),
        })),
      })),
      upsert: vi.fn(async (values: unknown) =>
      {
        upserts.push(values);

        return { error: upsertError };
      }),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("MP_CLIENT_ID", "cid-test");
  vi.stubEnv("MP_CLIENT_SECRET", "sec-test");
});

describe("GET /api/integrations/mercadopago/callback",
() =>
{
  it("debería marcar cancelado cuando MP devuelve error",
  async () =>
  {
    const state = codificarMpState({ negocioId: "neg-1", next: "/onboarding?paso=3" });
    const response = await GET(new Request(callbackUrl(`error=access_denied&state=${state}`)));
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(307);
    expect(location).toContain("mp=cancelado");
    expect(location).toContain("/onboarding?paso=3");
  });

  it("debería marcar error sin code o state",
  async () =>
  {
    for (const params of ["code=abc", "code=abc&state=  ", "state=neg-1"])
    {
      const response = await GET(new Request(callbackUrl(params)));

      expect(response.headers.get("location")).toContain("mp=error");
    }
  });

  it("debería marcar error sin credenciales de MP",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "");

    const response = await GET(new Request(callbackState("TG-1", "neg-1")));

    expect(response.headers.get("location")).toContain("mp=error");
  });

  it("debería redirigir al login sin sesión",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    const response = await GET(new Request(callbackState("TG-1", "neg-1")));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=/dashboard/config");
  });

  it("debería marcar error si el state no pertenece al dueño",
  async () =>
  {
    sesionDueno();
    stubCallback(null);

    const response = await GET(new Request(callbackState("TG-1", "neg-ajeno")));

    expect(response.headers.get("location")).toContain("mp=error");
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it("debería rechazar al dueño demo sin guardar tokens",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "demo-id", email: "demo@turnomas.com" } } }) },
    } as never);
    stubCallback({ id: "neg-demo" });

    const response = await GET(new Request(callbackState("TG-1", "neg-demo")));

    expect(response.headers.get("location")).toContain("mp=demo");
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it("debería guardar tokens y marcar ok con code válido",
  async () =>
  {
    sesionDueno();
    const upserts: unknown[] = [];
    stubCallback({ id: "neg-1" }, null, upserts);
    mockExchange.mockResolvedValueOnce({
      accessToken: "APP_USR-1",
      refreshToken: "TG-1",
      userId: "123",
    });

    const response = await GET(new Request(callbackState("TG-1", "neg-1")));

    expect(response.headers.get("location")).toContain("mp=ok");
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      negocio_id: "neg-1",
      mercadopago_access_token: "APP_USR-1",
      mercadopago_refresh_token: "TG-1",
      mercadopago_user_id: "123",
    });
  });

  it("debería volver al destino del state con mp=ok",
  async () =>
  {
    sesionDueno();
    stubCallback({ id: "neg-1" });
    mockExchange.mockResolvedValueOnce({
      accessToken: "APP_USR-1",
      refreshToken: "TG-1",
      userId: "123",
    });

    const response = await GET(new Request(callbackState("TG-1", "neg-1", "/onboarding?paso=3")));
    const location = response.headers.get("location") ?? "";

    expect(location).toContain("/onboarding?paso=3");
    expect(location).toContain("mp=ok");
  });

  it("debería marcar error si MP rechaza el code",
  async () =>
  {
    sesionDueno();
    stubCallback({ id: "neg-1" });
    mockExchange.mockRejectedValueOnce(new Error("MercadoPago rechazó"));

    const response = await GET(new Request(callbackState("TG-mal", "neg-1")));

    expect(response.headers.get("location")).toContain("mp=error");
  });
});
