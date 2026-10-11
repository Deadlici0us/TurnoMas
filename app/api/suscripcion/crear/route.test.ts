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
  return { subscriptionService: { crearParaNegocio: vi.fn() } };
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
const mockCrear = vi.mocked(subscriptionService.crearParaNegocio);
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

describe("POST /api/suscripcion/crear",
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
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("debería exigir sesión iniciada",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockReturnValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    const response = await POST();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Tenés que iniciar sesión para activar el plan.");
  });

  it("debería bloquear al dueño demo",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockImplementationOnce(() =>
    {
      throw new Error("La cuenta demo es de solo lectura.");
    });
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "demo-id", email: "demo@turnomas.com" } } }) },
    } as never);

    const response = await POST();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toContain("solo lectura");
  });

  it("debería exigir email para el débito",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockReturnValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: null } } }) },
    } as never);

    const response = await POST();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Necesitamos tu email para el débito mensual.");
  });

  it("debería exigir negocio antes de suscribir",
  async () =>
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
            single: async () => ({ data: null }),
          }),
        }),
      }),
    } as never);

    const response = await POST();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Creá tu negocio antes de activar el plan.");
  });

  it("debería devolver el link de autorización de MP",
  async () =>
  {
    sesionDueno();
    mockCrear.mockResolvedValueOnce({ id: "pre-1", initPoint: "https://mp/sus/1" });

    const response = await POST();
    const body = await response.json() as { success: boolean; initPoint: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, preapprovalId: "pre-1", initPoint: "https://mp/sus/1" });
    expect(mockCrear).toHaveBeenCalledWith("neg-1", "dueno@negocio.com", null);
  });

  it("debería devolver 502 cuando MP falla",
  async () =>
  {
    sesionDueno();
    mockCrear.mockRejectedValueOnce(new Error("No se pudo crear la suscripción en MercadoPago."));

    const response = await POST();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No se pudo crear la suscripción en MercadoPago.");
  });
});
