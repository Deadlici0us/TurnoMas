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

const URL_BASE = "http://localhost/auth/callback";

function callbackUrl(params: string): string
{
  return params.length > 0 ? `${URL_BASE}?${params}` : URL_BASE;
}

/** Activa el modo Supabase (no demo). */
function modoSupabase(): void
{
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
}

/**
 * Sesión Supabase con intercambio configurable.
 *
 * @param user Usuario autenticado o null.
 * @param exchangeError Error del intercambio o null.
 * @param negocio Dato para hasNegocio (admin y sesión).
 */
function sesionSupabase(
  user: { id: string } | null,
  exchangeError: { message: string } | null = null,
  negocio: unknown = { id: "neg-1" },
): void
{
  mockServer.mockResolvedValue({
    auth: {
      exchangeCodeForSession: async () => ({ error: exchangeError }),
      getUser: async () => ({ data: { user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: negocio }),
        }),
      }),
    }),
  } as never);
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: negocio }),
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

describe("GET /auth/callback",
() =>
{
  it("debería respetar next en modo demo",
  async () =>
  {
    const response = await GET(new Request(callbackUrl("next=/agenda")) as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/agenda");
  });

  it("debería ir al dashboard en modo demo sin next",
  async () =>
  {
    const response = await GET(new Request(callbackUrl("")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("debería rechazar next abierto en modo demo",
  async () =>
  {
    const response = await GET(new Request(callbackUrl("next=https://evil.com")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("debería pedir login sin code en modo supabase",
  async () =>
  {
    modoSupabase();

    const response = await GET(new Request(callbackUrl("")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/login?error=oauth");
  });

  it("debería pedir login cuando Supabase no está disponible",
  async () =>
  {
    modoSupabase();
    mockServer.mockRejectedValueOnce(new Error("supabase caído"));

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/login?error=oauth");
  });

  it("debería pedir login cuando el intercambio falla",
  async () =>
  {
    modoSupabase();
    sesionSupabase({ id: "user-1" }, { message: "bad code" });

    const response = await GET(new Request(callbackUrl("code=malo")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/login?error=oauth");
  });

  it("debería pedir sesión cuando no hay usuario",
  async () =>
  {
    modoSupabase();
    sesionSupabase(null);

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/login?error=sesion");
  });

  it("debería ir al dashboard con negocio existente",
  async () =>
  {
    modoSupabase();
    sesionSupabase({ id: "user-1" });

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("debería ir al onboarding sin negocio",
  async () =>
  {
    modoSupabase();
    sesionSupabase({ id: "user-1" }, null, null);

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/onboarding");
  });

  it("debería usar la sesión cuando el admin falla",
  async () =>
  {
    modoSupabase();
    mockServer.mockResolvedValue({
      auth: {
        exchangeCodeForSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "neg-1" } }),
          }),
        }),
      }),
    } as never);
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("sin service key");
    });

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("debería ir al onboarding cuando todo falla",
  async () =>
  {
    modoSupabase();
    mockServer.mockResolvedValue({
      auth: {
        exchangeCodeForSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () =>
            {
              throw new Error("db caída");
            },
          }),
        }),
      }),
    } as never);
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("sin service key");
    });

    const response = await GET(new Request(callbackUrl("code=abc")) as never);

    expect(response.headers.get("location")).toBe("http://localhost/onboarding");
  });
});
