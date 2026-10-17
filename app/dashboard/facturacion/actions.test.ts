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
  return { subscriptionService: { cancelarParaNegocio: vi.fn() } };
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
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Sesión de dueño no demo con negocio. */
function sesionDueno(negocio: unknown = { id: "neg-1", suscripcion_mp_id: "pre-1" }): void
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
    it("debería cancelar en MP y limpiar el plan local",
    async () =>
    {
      sesionDueno();
      mockCancelar.mockResolvedValueOnce(undefined);

      await cancelarPlan();

      expect(mockCancelar).toHaveBeenCalledWith("neg-1", "pre-1");
    });

    it("debería exigir plan activo para cancelar",
    async () =>
    {
      sesionDueno({ id: "neg-1", suscripcion_mp_id: null });

      await expect(cancelarPlan()).rejects.toThrow("No tenés un plan activo para cancelar.");
      expect(mockCancelar).not.toHaveBeenCalled();
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
