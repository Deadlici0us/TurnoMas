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
  return { subscriptionService: { crearParaNegocio: vi.fn(), reconciliar: vi.fn() } };
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
const mockReconciliar = vi.mocked(subscriptionService.reconciliar);
const mockServer = vi.mocked(getSupabaseServer);
const mockAdmin = vi.mocked(getSupabaseAdmin);

/** Request JSON con el email de pago. */
function solicitud(body: Record<string, unknown> = { payerEmail: "pagador@mp.com" }): Request
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
  mockReconciliar.mockResolvedValue({ estado: "none", preapprovalId: null, initPoint: null });
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

  it("debería usar el email de pago del body",
  async () =>
  {
    sesionDueno();
    mockCrear.mockResolvedValueOnce({ id: "pre-1", initPoint: "https://mp/1", status: "pending" });

    await POST(solicitud({ payerEmail: "pago@mp.com" }));

    expect(mockCrear).toHaveBeenCalledWith("neg-1", "pago@mp.com", null);
  });

  it("debería exigir email de pago",
  async () =>
  {
    mockAssertModo.mockResolvedValue(undefined);
    mockAssertDueno.mockReturnValue(undefined);
    mockServer.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1", email: null } } }) },
    } as never);

    const response = await POST(solicitud({ payerEmail: "   " }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Necesitamos el email de tu cuenta de MercadoPago.");
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

  it("debería devolver el link de pago de MP",
  async () =>
  {
    sesionDueno();
    mockCrear.mockResolvedValueOnce({ id: "pre-1", initPoint: "https://mp/checkout/1", status: "pending" });

    const response = await POST(solicitud());
    const body = await response.json() as { success: boolean; initPoint: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      preapprovalId: "pre-1",
      initPoint: "https://mp/checkout/1",
      status: "pending",
    });
  });

  it("debería devolver activado si la reconciliación encuentra una autorizada",
  async () =>
  {
    sesionDueno();
    mockReconciliar.mockResolvedValueOnce({ estado: "active", preapprovalId: "pre-1", initPoint: null });

    const response = await POST(solicitud());
    const body = await response.json() as { activado: boolean; estado: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, activado: true, estado: "active" });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("debería reutilizar la suscripción pendiente sin crear otra",
  async () =>
  {
    sesionDueno();
    mockReconciliar.mockResolvedValueOnce({
      estado: "pending",
      preapprovalId: "pre-7",
      initPoint: "https://mp/checkout/7",
    });

    const response = await POST(solicitud());
    const body = await response.json() as { initPoint: string; reusado: boolean };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      preapprovalId: "pre-7",
      initPoint: "https://mp/checkout/7",
      status: "pending",
      reusado: true,
    });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("debería crear aunque la reconciliación falle",
  async () =>
  {
    sesionDueno();
    mockReconciliar.mockRejectedValueOnce(new Error("MP caído"));
    mockCrear.mockResolvedValueOnce({ id: "pre-1", initPoint: "https://mp/checkout/1", status: "pending" });

    const response = await POST(solicitud());

    expect(response.status).toBe(200);
    expect(mockCrear).toHaveBeenCalled();
  });

  it("debería devolver 502 con detalle fuera de producción",
  async () =>
  {
    sesionDueno();
    mockCrear.mockRejectedValueOnce(new Error("No se pudo crear la suscripción en MercadoPago."));

    const response = await POST(solicitud());
    const body = await response.json() as { error: string; detalle: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos activar el plan. Probá de nuevo.");
    expect(body.detalle).toBe("No se pudo crear la suscripción en MercadoPago.");
  });

  it("debería ocultar el detalle en producción",
  async () =>
  {
    vi.stubEnv("VERCEL_ENV", "production");
    sesionDueno();
    mockCrear.mockRejectedValueOnce(new Error("No se pudo crear la suscripción en MercadoPago."));

    const response = await POST(solicitud());
    const body = await response.json() as { error: string; detalle?: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("No pudimos activar el plan. Probá de nuevo.");
    expect(body.detalle).toBeUndefined();
  });

  it("debería explicar el rechazo por email de MercadoPago",
  async () =>
  {
    sesionDueno();
    mockCrear.mockRejectedValueOnce(
      new Error("Both payer and collector must be real or test users."));

    const response = await POST(solicitud());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("Usá el email de la misma cuenta de MercadoPago con la que vas a pagar.");
  });
});
