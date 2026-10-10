import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
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

const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

const URL_BASE = "http://localhost/api/integrations/google/callback";

function callbackUrl(params: string): string
{
  return `${URL_BASE}?${params}`;
}

/** Sesión de dueño autenticado. */
function sesionDueno(): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
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

/** Google que devuelve tokens válidos. */
function googleOk(refreshToken: string | null = "refresh-1"): void
{
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ access_token: "access-1", refresh_token: refreshToken }),
  })));
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "sec-test");
});

describe("GET /api/integrations/google/callback",
() =>
{
  it("debería marcar cancelado cuando Google devuelve error",
  async () =>
  {
    const response = await GET(new Request(callbackUrl("error=access_denied")));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("gcal=cancelado");
  });

  it("debería marcar error sin code o state",
  async () =>
  {
    for (const params of ["code=abc", "code=abc&state=  ", "state=neg-1"])
    {
      const response = await GET(new Request(callbackUrl(params)));

      expect(response.headers.get("location")).toContain("gcal=error");
    }
  });

  it("debería marcar error sin credenciales de Google",
  async () =>
  {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.headers.get("location")).toContain("gcal=error");
  });

  it("debería redirigir al login sin sesión",
  async () =>
  {
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=/dashboard/config");
  });

  it("debería rechazar states de otro dueño",
  async () =>
  {
    sesionDueno();
    stubCallback(null);
    googleOk();

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-ajeno")));

    expect(response.headers.get("location")).toContain("gcal=error");
  });

  it("debería marcar sin-refresh sin refresh_token",
  async () =>
  {
    sesionDueno();
    stubCallback({ id: "neg-1" });
    googleOk(null);

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.headers.get("location")).toContain("gcal=sin-refresh");
  });

  it("debería marcar error cuando el upsert falla",
  async () =>
  {
    sesionDueno();
    stubCallback({ id: "neg-1" }, {});
    googleOk();

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.headers.get("location")).toContain("gcal=error");
  });

  it("debería guardar el token y marcar ok",
  async () =>
  {
    sesionDueno();
    const upserts: unknown[] = [];
    stubCallback({ id: "neg-1" }, null, upserts);
    googleOk();

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.headers.get("location")).toContain("gcal=ok");
    expect(upserts[0]).toMatchObject({
      negocio_id: "neg-1",
      google_refresh_token: "refresh-1",
    });
  });

  it("debería marcar error cuando Google rechaza el code",
  async () =>
  {
    sesionDueno();
    stubCallback({ id: "neg-1" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400 })));

    const response = await GET(new Request(callbackUrl("code=abc&state=neg-1")));

    expect(response.headers.get("location")).toContain("gcal=error");
  });
});
