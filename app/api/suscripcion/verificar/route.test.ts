import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertDuenoEditable: vi.fn(), assertModoEditable: vi.fn() };
});

vi.mock("@/lib/services/subscription", () =>
{
  return { subscriptionService: { reconciliar: vi.fn() } };
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
const mockReconciliar = vi.mocked(subscriptionService.reconciliar);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Sesión de dueño autenticado no demo con negocio. */
function sesionDueno(): void
{
  mockAssertModo.mockResolvedValue(undefined);
  mockAssertDueno.mockReturnValue(undefined);
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueno@negocio.com" } } }) },
  } as never);
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: "neg-1" } }),
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

describe("POST /api/suscripcion/verificar",
  () =>
  {
    it("debería bloquear la demo con 403",
    async () =>
    {
      mockAssertModo.mockRejectedValueOnce(new Error("La cuenta demo es de solo lectura."));

      const response = await POST();
      const body = await response.json() as { error: string };

      expect(response.status).toBe(403);
      expect(body.error).toBe("La cuenta demo es de solo lectura.");
      expect(mockReconciliar).not.toHaveBeenCalled();
    });

    it("debería exigir sesión iniciada",
    async () =>
    {
      mockAssertModo.mockResolvedValue(undefined);
      mockServer.mockResolvedValue({
        auth: { getUser: async () => ({ data: { user: null } }) },
      } as never);

      const response = await POST();
      const body = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe("Tenés que iniciar sesión para verificar el pago.");
    });

    it("debería activar cuando MP tiene la suscripción autorizada",
    async () =>
    {
      sesionDueno();
      mockReconciliar.mockResolvedValueOnce({ estado: "active", preapprovalId: "pre-1", initPoint: null });

      const response = await POST();
      const body = await response.json() as { estado: string; activado: boolean };

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, estado: "active", activado: true });
      expect(mockReconciliar).toHaveBeenCalledWith("neg-1");
    });

    it("debería informar pendiente sin activar",
    async () =>
    {
      sesionDueno();
      mockReconciliar.mockResolvedValueOnce({ estado: "pending", preapprovalId: "pre-1", initPoint: "https://mp/p" });

      const response = await POST();
      const body = await response.json() as { estado: string; activado: boolean };

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, estado: "pending", activado: false });
    });

    it("debería devolver 502 con detalle fuera de producción",
    async () =>
    {
      sesionDueno();
      mockReconciliar.mockRejectedValueOnce(new Error("MP caído"));

      const response = await POST();
      const body = await response.json() as { error: string; detalle: string };

      expect(response.status).toBe(502);
      expect(body.error).toBe("No pudimos verificar el pago. Probá de nuevo.");
      expect(body.detalle).toBe("MP caído");
    });

    it("debería ocultar el detalle en producción",
    async () =>
    {
      vi.stubEnv("VERCEL_ENV", "production");
      sesionDueno();
      mockReconciliar.mockRejectedValueOnce(new Error("MP caído"));

      const response = await POST();
      const body = await response.json() as { error: string; detalle?: string };

      expect(response.status).toBe(502);
      expect(body.error).toBe("No pudimos verificar el pago. Probá de nuevo.");
      expect(body.detalle).toBeUndefined();
    });
  });
