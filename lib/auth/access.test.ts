import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/supabase/proxy-client", () => ({ createSupabaseProxyClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/services/subscription", () => ({
  subscriptionService: { verificarPreapproval: vi.fn() },
}));

import { resolveAccess } from "./access";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { subscriptionService } from "@/lib/services/subscription";

const mockProxy = vi.mocked(createSupabaseProxyClient);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockVerificar = vi.mocked(subscriptionService.verificarPreapproval);

const HEADERS = new Headers();

/** Stub del cliente de proxy con (o sin) usuario autenticado. */
function stubProxy(userId: string | null): void
{
  mockProxy.mockReturnValue({
    supabase: {
      auth: {
        getUser: async () => ({
          data: { user: userId === null ? null : { id: userId } },
        }),
      },
    },
    response: () => NextResponse.next(),
  } as never);
}

/** Stub del cliente admin devolviendo (o no) una fila de negocio. */
function stubNegocio(row: Record<string, unknown> | null): void
{
  mockAdmin.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row }),
        }),
      }),
    }),
  } as never);
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_123");
  stubProxy(null);
  stubNegocio(null);
});

describe("resolveAccess",
() =>
{
  it("debería ser invitado sin Supabase configurado", async () =>
  {
    vi.unstubAllEnvs();

    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "guest", subscription: "trial", hasBusiness: false });
    expect(mockProxy).not.toHaveBeenCalled();
  });

  it("debería ser invitado sin usuario", async () =>
  {
    stubProxy(null);
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "guest", subscription: "trial", hasBusiness: false });
  });

  it("debería resolver bloqueo del negocio vencido", async () =>
  {
    stubProxy("user-1");
    stubNegocio({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "trial",
      suscripcion_mp_id: null,
      suscripcion_mora_desde: null,
    });
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "blocked", hasBusiness: true });
  });

  it("debería resolver negocio activo", async () =>
  {
    stubProxy("user-1");
    stubNegocio({
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "mp-1",
      suscripcion_mora_desde: null,
    });
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "active", hasBusiness: true });
  });

  it("debería marcar sin negocio al dueño recién logueado", async () =>
  {
    stubProxy("user-2");
    stubNegocio(null);
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "trial", hasBusiness: false });
  });

  it("no debería romper si el admin no está configurado", async () =>
  {
    stubProxy("user-3");
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
    });
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "trial", hasBusiness: false });
  });

  it("debería rescatar en línea cuando MP confirma authorized", async () =>
  {
    stubProxy("user-1");
    stubNegocio({
      id: "neg-1",
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "mp-1",
      suscripcion_mora_desde: null,
      suscripcion_vence_en: "2026-01-02T00:00:00Z",
      suscripcion_cancelada_en: null,
      suscripcion_mp_status: null,
      suscripcion_verificada_en: null,
    });
    mockVerificar.mockResolvedValueOnce({ status: "authorized", activo: true, nextPaymentDate: null });

    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot.subscription).toBe("active");
    expect(mockVerificar).toHaveBeenCalledWith("neg-1", "mp-1");
  });

  it("debería mantener bloqueado si MP no responde", async () =>
  {
    stubProxy("user-1");
    stubNegocio({
      id: "neg-1",
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "mp-1",
      suscripcion_mora_desde: null,
      suscripcion_vence_en: "2026-01-02T00:00:00Z",
      suscripcion_cancelada_en: null,
      suscripcion_mp_status: null,
      suscripcion_verificada_en: null,
    });
    mockVerificar.mockRejectedValueOnce(new Error("MP caído"));

    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot.subscription).toBe("blocked");
  });

  it("no debería reverificar si la verificación es reciente", async () =>
  {
    stubProxy("user-1");
    stubNegocio({
      id: "neg-1",
      created_at: "2026-01-01T00:00:00Z",
      suscripcion_estado: "active",
      suscripcion_mp_id: "mp-1",
      suscripcion_mora_desde: null,
      suscripcion_vence_en: "2026-01-02T00:00:00Z",
      suscripcion_cancelada_en: null,
      suscripcion_mp_status: "cancelled",
      suscripcion_verificada_en: new Date().toISOString(),
    });

    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot.subscription).toBe("blocked");
    expect(mockVerificar).not.toHaveBeenCalled();
  });
});
