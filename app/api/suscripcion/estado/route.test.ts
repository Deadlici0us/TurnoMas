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

const PASADO = "2020-01-01T00:00:00.000Z";

/** Sesión de dueño autenticado con negocio. */
function sesionDueno(negocio: unknown = {
  created_at: PASADO,
  suscripcion_estado: "active",
  suscripcion_mp_id: "pre-1",
  suscripcion_mora_desde: null,
}): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueno@negocio.com" } } }) },
  } as never);
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: negocio }),
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

describe("GET /api/suscripcion/estado",
  () =>
  {

    it("debería exigir sesión iniciada",
    async () =>
    {
      mockServer.mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: null } }) },
      } as never);

      const response = await GET();

      expect(response.status).toBe(401);
    });

    it("debería informar plan activo y no bloqueado",
    async () =>
    {
      sesionDueno();

      const response = await GET();
      const body = await response.json() as { estado: string; bloqueado: boolean };

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, estado: "active", bloqueado: false });
    });

    it("debería informar bloqueado cuando venció la prueba",
    async () =>
    {
      sesionDueno({
        created_at: PASADO,
        suscripcion_estado: null,
        suscripcion_mp_id: null,
        suscripcion_mora_desde: null,
      });

      const response = await GET();
      const body = await response.json() as { estado: string; bloqueado: boolean };

      expect(response.status).toBe(200);
      expect(body.estado).toBe("blocked");
      expect(body.bloqueado).toBe(true);
    });

    it("debería informar prueba en curso",
    async () =>
    {
      sesionDueno({
        created_at: new Date().toISOString(),
        suscripcion_estado: null,
        suscripcion_mp_id: null,
        suscripcion_mora_desde: null,
      });

      const response = await GET();
      const body = await response.json() as { estado: string; bloqueado: boolean };

      expect(response.status).toBe(200);
      expect(body.estado).toBe("trial");
      expect(body.bloqueado).toBe(false);
    });

    it("debería pedir negocio sin fila",
    async () =>
    {
      sesionDueno(null);

      const response = await GET();

      expect(response.status).toBe(400);
    });
  });
