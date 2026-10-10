import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertModoEditable: vi.fn() };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAssert = vi.mocked(assertModoEditable);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

const URL_BASE = "http://localhost/api/integrations/google/authorize";

/** Sesión de dueño autenticado. */
function sesionDueno(): void
{
  mockAssert.mockResolvedValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  } as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/integrations/google/authorize",
() =>
{
  it("debería bloquear la demo con 403",
  async () =>
  {
    mockAssert.mockRejectedValueOnce(new Error("La cuenta demo es de solo lectura."));

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("La cuenta demo es de solo lectura.");
  });

  it("debería exigir GOOGLE_CLIENT_ID",
  async () =>
  {
    mockAssert.mockResolvedValue(undefined);

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Falta configurar GOOGLE_CLIENT_ID en el entorno.");
  });

  it("debería redirigir al login sin sesión",
  async () =>
  {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    const response = await GET(new Request(URL_BASE));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=/dashboard/config");
  });

  it("debería exigir negocio antes de conectar",
  async () =>
  {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
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
    expect(body.error).toBe("Creá tu negocio antes de conectar Google.");
  });

  it("debería redirigir al consentimiento con state del negocio",
  async () =>
  {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
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

    expect(response.status).toBe(307);
    expect(location).toContain("accounts.google.com");
    expect(location).toContain("state=neg-1");
    expect(location).toContain("access_type=offline");
  });

  it("debería devolver 500 cuando Supabase falla",
  async () =>
  {
    vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
    mockAssert.mockResolvedValue(undefined);
    mockServer.mockRejectedValueOnce(new Error("supabase caído"));

    const response = await GET(new Request(URL_BASE));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("No pudimos iniciar la conexión con Google.");
  });
});
