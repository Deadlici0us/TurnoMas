import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscriptionService } from "./subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

/** Stub de update().eq() que captura valores. */
function stubUpdate(updates: unknown[] = [], error: { message?: string } | null = null)
{
  mockGetSupabaseAdmin.mockReturnValue({
    from: () => ({
      update: (values: unknown) =>
      {
        updates.push(values);

        return { eq: async () => ({ error }) };
      },
    }),
  } as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("subscriptionService.activarSuscripcion",
() =>
{
  it("debería guardar estado active con mp_id y limpiar la mora",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.activarSuscripcion("neg-1", "pre-1");

    expect(updates).toEqual([{
      suscripcion_estado: "active",
      suscripcion_mp_id: "pre-1",
      suscripcion_mora_desde: null,
    }]);
  });
});

describe("subscriptionService.marcarPastDue",
() =>
{
  it("debería guardar past_due con inicio de mora",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.marcarPastDue("neg-1", new Date("2026-10-01T00:00:00Z"));

    expect(updates).toEqual([{
      suscripcion_estado: "past_due",
      suscripcion_mora_desde: "2026-10-01T00:00:00.000Z",
    }]);
  });
});

describe("subscriptionService.cancelarSuscripcionLocal",
() =>
{
  it("debería limpiar mp_id y volver a blocked (el trial decide por fecha)",
  async () =>
  {
    const updates: unknown[] = [];
    stubUpdate(updates);

    await subscriptionService.cancelarSuscripcionLocal("neg-1");

    expect(updates).toEqual([{
      suscripcion_estado: "blocked",
      suscripcion_mp_id: null,
      suscripcion_mora_desde: null,
    }]);
  });
});
