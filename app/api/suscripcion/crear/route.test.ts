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
  return { subscriptionService: { crearParaNegocio: vi.fn(), activarSuscripcion: vi.fn() } };
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
const mockActivar = vi.mocked(subscriptionService.activarSuscripcion);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Request JSON con el token de tarjeta y, opcional, el email del pagador. */
function solicitud(body: Record<string, unknown> = { cardTokenId: "card-tok-1" }): Request
{
  return new Request("http://localhost/api/suscripcion/crear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("La cuenta demo es de solo lectura.");
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("debería exigir el token de la tarjeta",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);

    const response = await POST(solicitud({ cardTokenId: "  " }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Falta el token de la tarjeta.");
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

    const response = await POST(solicitud());
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

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toContain("solo lectura");
  });

  it("debería usar el email del pagador del body antes que el de la sesión",
  async () =>
  {
    sesionDueno();
    mockCrear.mockResolvedValueOnce({ id: "pre-1", status: "authorized" });

    await POST(solicitud({ cardTokenId: "card-tok-1", payerEmail: "pagador@mp.com" }));

    expect(mockCrear).toHaveBeenCalledWith("neg-1", "pagador@mp.com", null, "card-tok-1");
  });

  it("debería exigir email para el débito",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockReturnValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: null } } }) },
    } as never);

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Necesitamos el email del pagador para el débito mensual.");
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

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Creá tu negocio antes de activar el plan.");
  });

  it("debería activar la suscripción autorizada",
  async () =>
  {
    sesionDueno();
    mockCrear.mockResolvedValueOnce({ id: "pre-1", status: "authorized" });

    const response = await POST(solicitud());
    const body = await response.json() as { success: boolean; status: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, preapprovalId: "pre-1", status: "authorized" });
    expect(mockActivar).toHaveBeenCalledWith("neg-1", "pre-1");
  });

  it("debería devolver 502 cuando MP falla",
  async () =>
  {
    sesionDueno();
    mockCrear.mockRejectedValueOnce(new Error("No se pudo crear la suscripción en MercadoPago."));

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos activar el plan. Probá de nuevo.");
  });
});
