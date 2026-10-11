import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { decodificarMpState } from "@/lib/payments/mp-oauth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertDuenoEditable: vi.fn(), assertModoEditable: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAssertModo = vi.mocked(assertModoEditable);
const mockAssertDueno = vi.mocked(assertDuenoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

const URL_BASE = "http://localhost/api/integrations/mercadopago/authorize";

/** Sesión de dueño autenticado no demo. */
function sesionDueno(): void
{
  mockAssertModo.mockResolvedValue(undefined);
  mockAssertDueno.mockReturnValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueño@negocio.com" } } }) },
  } as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/integrations/mercadopago/authorize",
() =>
{
  it("debería bloquear la demo local con 403",
  async () =>
  {
    mockAssertModo.mockRejectedValueOnce(new Error("La cuenta demo es de solo lectura."));

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("La cuenta demo es de solo lectura.");
  });

  it("debería exigir MP_CLIENT_ID",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Falta configurar MP_CLIENT_ID en el entorno.");
  });

  it("debería redirigir al login sin sesión",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "cid-test");
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockReturnValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    const response = await GET(new Request(URL_BASE));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=/dashboard/config");
  });

  it("debería bloquear al dueño demo con 403",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "cid-test");
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockImplementationOnce(() =>
    {
      throw new Error("La cuenta demo es de solo lectura.");
    });
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "demo-id", email: "demo@turnomas.com" } } }) },
    } as never);

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toContain("solo lectura");
  });

  it("debería exigir negocio antes de conectar",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "cid-test");
    sesionDueno();
    mockAdmin.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null }),
          }),
        }),
      }),
    } as never);

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Creá tu negocio antes de conectar MercadoPago.");
  });

  it("debería redirigir al consentimiento con state del negocio",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "cid-test");
    sesionDueno();
    mockAdmin.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { id: "neg-1" } }),
          }),
        }),
      }),
    } as never);

    const response = await GET(new Request(URL_BASE));
    const location = response.headers.get("location") ?? "";
    const state = new URL(location).searchParams.get("state") ?? "";

    expect(response.status).toBe(307);
    expect(location).toContain("auth.mercadopago.com/authorization");
    expect(location).toContain("platform_id=mp");
    expect(decodificarMpState(state)).toEqual({ negocioId: "neg-1", next: null });
  });

  it("debería propagar el destino en el state",
  async () =>
  {
    vi.stubEnv("MP_CLIENT_ID", "cid-test");
    sesionDueno();
    mockAdmin.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { id: "neg-1" } }),
          }),
        }),
      }),
    } as never);

    const response = await GET(new Request(`${URL_BASE}?next=${encodeURIComponent("/onboarding?paso=3")}`));
    const location = response.headers.get("location") ?? "";
    const state = new URL(location).searchParams.get("state") ?? "";

    expect(response.status).toBe(307);
    expect(decodificarMpState(state)).toEqual({ negocioId: "neg-1", next: "/onboarding?paso=3" });
  });
});
