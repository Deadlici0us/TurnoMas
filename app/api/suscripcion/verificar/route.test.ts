import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";


vi.mock("@/lib/services/subscription", () =>
{
  return { subscriptionService: { reconciliar: vi.fn(), cancelarSuscripcionLocal: vi.fn() } };
});

vi.mock("@/lib/supabase/server", () =>
{
  return { getSupabaseServer: vi.fn() };
});

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockReconciliar = vi.mocked(subscriptionService.reconciliar);
const mockCancelarLocal = vi.mocked(subscriptionService.cancelarSuscripcionLocal);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Sesión de dueño autenticado con negocio. */
function sesionDueno(
  suscripcionEstado: string | null = "active",
  extra: Record<string, unknown> = {},
): void
{
  mockServer.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "dueno@negocio.com" } } }) },
  } as never);
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "neg-1", suscripcion_estado: suscripcionEstado, ...extra },
          }),
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

    it("debería exigir sesión iniciada",
    async () =>
    {
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

    it("debería limpiar el plan local cuando MP ya no tiene la suscripción",
    async () =>
    {
      sesionDueno("active");
      mockReconciliar.mockResolvedValueOnce({ estado: "none", preapprovalId: null, initPoint: null });

      const response = await POST();
      const body = await response.json() as { estado: string; activado: boolean };

      expect(response.status).toBe(200);
      expect(body.estado).toBe("none");
      expect(mockCancelarLocal).toHaveBeenCalledWith("neg-1");
    });

    it("no debería tocar el plan de un negocio en prueba",
    async () =>
    {
      sesionDueno("trial");
      mockReconciliar.mockResolvedValueOnce({ estado: "none", preapprovalId: null, initPoint: null });

      const response = await POST();

      expect(response.status).toBe(200);
      expect(mockCancelarLocal).not.toHaveBeenCalled();
    });

    it("no debería cortar el acceso de un plan cancelado dentro del período pago",
    async () =>
    {
      sesionDueno("active", {
        suscripcion_cancelada_en: "2026-06-01T00:00:00Z",
        suscripcion_vence_en: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      });
      mockReconciliar.mockResolvedValueOnce({ estado: "none", preapprovalId: null, initPoint: null });

      const response = await POST();

      expect(response.status).toBe(200);
      expect(mockCancelarLocal).not.toHaveBeenCalled();
    });

    it("debería limpiar el plan cancelado ya vencido",
    async () =>
    {
      sesionDueno("active", {
        suscripcion_cancelada_en: "2026-06-01T00:00:00Z",
        suscripcion_vence_en: new Date(Date.now() - 86_400_000).toISOString(),
      });
      mockReconciliar.mockResolvedValueOnce({ estado: "none", preapprovalId: null, initPoint: null });

      const response = await POST();

      expect(response.status).toBe(200);
      expect(mockCancelarLocal).toHaveBeenCalledWith("neg-1");
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
