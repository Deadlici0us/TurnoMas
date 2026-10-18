import { beforeEach, describe, expect, it, vi } from "vitest";

import { cancelarPlan } from "./actions";
import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

vi.mock("next/cache", () =>
{
  return { revalidatePath: vi.fn() };
});

vi.mock("@/lib/auth/demo-guard", () =>
{
  return { assertDuenoEditable: vi.fn(), assertModoEditable: vi.fn() };
});

vi.mock("@/lib/services/subscription", () =>
{
  return { subscriptionService: { cancelarParaNegocio: vi.fn(), cancelarSuscripcionLocal: vi.fn() } };
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
const mockCancelar = vi.mocked(subscriptionService.cancelarParaNegocio);
const mockCancelarLocal = vi.mocked(subscriptionService.cancelarSuscripcionLocal);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Sesión de dueño no demo con negocio. */
function sesionDueno(negocio: unknown = {
  id: "neg-1",
  suscripcion_mp_id: "pre-1",
  suscripcion_vence_en: "2026-11-01T00:00:00Z",
}): void
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

describe("cancelarPlan",
  () =>
  {
    it("debería cancelar en MP conservando el vencimiento del período pago",
    async () =>
    {
      sesionDueno();
      mockCancelar.mockResolvedValueOnce(undefined);

      await cancelarPlan();

      expect(mockCancelar).toHaveBeenCalledWith("neg-1", "pre-1", "2026-11-01T00:00:00Z");
    });

    it("debería cancelar en MP sin vencimiento cuando no hay período pago",
    async () =>
    {
      sesionDueno({ id: "neg-1", suscripcion_mp_id: "pre-1", suscripcion_vence_en: null });
      mockCancelar.mockResolvedValueOnce(undefined);

      await cancelarPlan();

      expect(mockCancelar).toHaveBeenCalledWith("neg-1", "pre-1", null);
    });

    it("debería limpiar el plan local sin preapproval en MP",
    async () =>
    {
      sesionDueno({ id: "neg-1", suscripcion_mp_id: null });

      await cancelarPlan();

      expect(mockCancelar).not.toHaveBeenCalled();
      expect(mockCancelarLocal).toHaveBeenCalledWith("neg-1");
    });

    it("debería bloquear al dueño demo",
    async () =>
    {
      sesionDueno();
      mockAssertDueno.mockImplementationOnce(() =>
      {
        throw new Error("La cuenta demo es de solo lectura.");
      });

      await expect(cancelarPlan()).rejects.toThrow("La cuenta demo es de solo lectura.");
    });
  });
