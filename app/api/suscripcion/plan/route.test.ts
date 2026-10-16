import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { crearPlanPreapproval } from "@/lib/payments/subscription";

vi.mock("@/lib/payments/subscription", () =>
{
  return { crearPlanPreapproval: vi.fn(), resolverPlanPais: vi.fn(() => ({ monto: 14999, currency: "ARS", etiqueta: "$ 14.999 ARS/mes", planId: null })) };
});

const mockCrearPlan = vi.mocked(crearPlanPreapproval);

/** Request con bearer de admin y URL pública configurable. */
function solicitud(token: string): Request
{
  return new Request("http://localhost/api/suscripcion/plan", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/suscripcion/plan",
() =>
{
  it("debería responder 503 sin MP_PLAN_ADMIN_SECRET configurado",
  async () =>
  {
    const response = await POST(solicitud("x"));

    expect(response.status).toBe(503);
    expect(mockCrearPlan).not.toHaveBeenCalled();
  });

  it("debería rechazar un bearer inválido",
  async () =>
  {
    vi.stubEnv("MP_PLAN_ADMIN_SECRET", "secreto");

    const response = await POST(solicitud("otro"));

    expect(response.status).toBe(401);
    expect(mockCrearPlan).not.toHaveBeenCalled();
  });

  it("debería crear el plan y devolver su id",
  async () =>
  {
    vi.stubEnv("MP_PLAN_ADMIN_SECRET", "secreto");
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");
    mockCrearPlan.mockResolvedValueOnce({ id: "plan-ar-1" });

    const response = await POST(solicitud("secreto"));
    const body = await response.json() as { id: string };

    expect(response.status).toBe(201);
    expect(body).toEqual({ id: "plan-ar-1" });
    expect(mockCrearPlan).toHaveBeenCalledWith({
      reason: "TurnoMas - Plan mensual",
      backUrl: "https://turnomas.com/dashboard/facturacion",
      monto: 14999,
      currency: "ARS",
      platformToken: "APP_USR-platform",
    });
  });

  it("debería devolver 502 si MP falla",
  async () =>
  {
    vi.stubEnv("MP_PLAN_ADMIN_SECRET", "secreto");
    vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-platform");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");
    mockCrearPlan.mockRejectedValueOnce(new Error("boom"));

    const response = await POST(solicitud("secreto"));

    expect(response.status).toBe(502);
  });
});
