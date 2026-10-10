import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

const { mockReseed } = vi.hoisted(() =>
{
  return { mockReseed: vi.fn() };
});

vi.mock("@/lib/demo/reseed", () =>
{
  return { reseedDemoBusiness: mockReseed };
});

const mockServer = vi.mocked(getSupabaseServer);

function sesion(user: { id: string; email?: string } | null): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/demo/reset",
() =>
{
  it("debería exigir sesión iniciada",
  async () =>
  {
    sesion(null);

    const response = await POST();
    const body = await response.json() as { ok: boolean; error: string };

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, error: "Tenés que iniciar sesión." });
  });

  it("debería rechazar a quien no es demo con 403",
  async () =>
  {
    sesion({ id: "user-comun", email: "comun@ejemplo.com" });

    const response = await POST();
    const body = await response.json() as { ok: boolean; error: string };

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ ok: false, error: "Solo la cuenta demo." });
    expect(mockReseed).not.toHaveBeenCalled();
  });

  it("debería resetear la demo para el dueño demo",
  async () =>
  {
    vi.stubEnv("DEMO_DUENIO_ID", "user-demo");
    sesion({ id: "user-demo", email: "otro@ejemplo.com" });
    mockReseed.mockResolvedValueOnce(undefined);

    const response = await POST();
    const body = await response.json() as { ok: boolean; reset: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, reset: true });
    expect(mockReseed).toHaveBeenCalledWith("user-demo");
  });

  it("debería devolver 500 cuando el reseed falla",
  async () =>
  {
    vi.stubEnv("DEMO_DUENIO_ID", "user-demo");
    sesion({ id: "user-demo" });
    mockReseed.mockRejectedValueOnce(new Error("db caída"));

    const response = await POST();
    const body = await response.json() as { ok: boolean; error: string };

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ ok: false, error: "No pudimos restablecer la demo. Probá de nuevo." });
  });
});
