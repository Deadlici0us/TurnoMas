import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/auth/auth-mode", () => ({ resolveAuthMode: vi.fn(() => "demo") }));
vi.mock("@/lib/supabase/proxy-client", () => ({ createSupabaseProxyClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/services/subscription", () => ({
  subscriptionService: { verificarPreapproval: vi.fn() },
}));

import { resolveAccess } from "./access";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { subscriptionService } from "@/lib/services/subscription";

const mockMode = vi.mocked(resolveAuthMode);
const mockProxy = vi.mocked(createSupabaseProxyClient);
const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockVerificar = vi.mocked(subscriptionService.verificarPreapproval);

const HEADERS = new Headers();

/** Stub del cliente de proxy con (o sin) usuario autenticado. */
function stubProxy(userId: string | null, email: string | null = null): void
{
  mockProxy.mockReturnValue({
    supabase: {
      auth: {
        getUser: async () => ({
          data: { user: userId === null ? null : { id: userId, email } },
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
  mockMode.mockReturnValue("demo");
  stubProxy(null);
  stubNegocio(null);
});

describe("resolveAccess (demo)",
() =>
{
  it("debería ser invitado sin la cookie demo",
  async () =>
  {
    const request = new NextRequest("http://localhost/");
    const { snapshot } = await resolveAccess(request, HEADERS);

    expect(snapshot).toEqual({ session: "guest", subscription: "trial", hasBusiness: false });
  });

  it("debería ser logueado en prueba con la cookie demo",
  async () =>
  {
    const request = new NextRequest("http://localhost/", { headers: { cookie: "session=demo" } });
    const { snapshot } = await resolveAccess(request, HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "demo", hasBusiness: true });
  });
});

describe("resolveAccess (supabase)",
() =>
{
  beforeEach(() => mockMode.mockReturnValue("supabase"));

  it("debería servir la demo con la cookie aunque Supabase esté configurado",
  async () =>
  {
    const request = new NextRequest("http://localhost/", { headers: { cookie: "session=demo" } });
    const { snapshot } = await resolveAccess(request, HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "demo", hasBusiness: true });
    expect(mockProxy).not.toHaveBeenCalled();
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería reconocer al dueño demo de Supabase sin consultar suscripción",
  async () =>
  {
    stubProxy("user-demo", "demo@turnomas.com");

    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "demo", hasBusiness: true });
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("debería ser invitado sin usuario",
  async () =>
  {
    stubProxy(null);
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "guest", subscription: "trial", hasBusiness: false });
  });

  it("debería resolver bloqueo del negocio vencido",
  async () =>
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

  it("debería resolver negocio activo",
  async () =>
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

  it("debería marcar sin negocio al dueño recién logueado",
  async () =>
  {
    stubProxy("user-2");
    stubNegocio(null);
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "trial", hasBusiness: false });
  });

  it("no debería romper si el admin no está configurado",
  async () =>
  {
    stubProxy("user-3");
    mockAdmin.mockImplementation(() =>
    {
      throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
    });
    const { snapshot } = await resolveAccess(new NextRequest("http://localhost/"), HEADERS);

    expect(snapshot).toEqual({ session: "authenticated", subscription: "trial", hasBusiness: false });
  });

  it("debería rescatar en línea cuando MP confirma authorized",
  async () =>
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

  it("debería mantener bloqueado si MP no responde",
  async () =>
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

  it("no debería reverificar si la verificación es reciente",
  async () =>
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
