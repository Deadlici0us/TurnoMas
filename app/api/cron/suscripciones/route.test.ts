import { beforeEach, describe, expect, it, vi } from "vitest";

import { criterioRiesgo, GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { promocionService } from "@/lib/services/promociones";
import { subscriptionService } from "@/lib/services/subscription";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

vi.mock("@/lib/services/promociones", () =>
{
  return { promocionService: { sincronizarPendientes: vi.fn() } };
});

vi.mock("@/lib/services/subscription", () =>
{
  return { subscriptionService: { verificarPreapproval: vi.fn() } };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);
const mockPromociones = vi.mocked(promocionService.sincronizarPendientes);
const mockVerificar = vi.mocked(subscriptionService.verificarPreapproval);

/** Stub del admin con la cadena select().not().or().order().limit(). */
function stubBarrido(filas: unknown[])
{
  const admin = {
    from: vi.fn(() => ({
      select: () => ({
        not: () => ({
          or: () => ({
            order: () => ({
              limit: async () => ({ data: filas }),
            }),
          }),
        }),
      }),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
}

function requestWith(firma: string | null = null): Request
{
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (firma !== null)
  {
    headers["upstash-signature"] = firma;
  }

  return new Request("http://localhost/api/cron/suscripciones", { method: "POST", headers });
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mockPromociones.mockResolvedValue({ revisadas: 0, sincronizadas: 0, errores: 0 });
  mockAdmin.mockImplementation(() =>
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
  });
});

describe("criterioRiesgo",
() =>
{
  it("debería cubrir sin verificar, reverificación vencida, near-vence y mora",
  () =>
  {
    const criterio = criterioRiesgo(new Date("2026-10-18T00:00:00Z"));

    expect(criterio).toContain("suscripcion_mp_status.is.null");
    expect(criterio).toContain("suscripcion_verificada_en.is.null");
    expect(criterio).toContain("suscripcion_verificada_en.lt.2026-10-17T12:00:00.000Z");
    expect(criterio).toContain("suscripcion_vence_en.lte.2026-10-20T00:00:00.000Z");
    expect(criterio).toContain("suscripcion_estado.eq.past_due");
  });
});

describe("POST /api/cron/suscripciones",
() =>
{
  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "clave-de-test-qstash");

    try
    {
      const response = await POST(requestWith("firma.invalida.test"));
      const body = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe("Firma de QStash inválida.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería responder sin base disponible",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");

    try
    {
      const response = await POST(requestWith());
      const body = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toBe("Cron no disponible sin base configurada.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería fallar cerrado en producción sin claves configuradas",
  async () =>
  {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");

    try
    {
      const response = await POST(requestWith());
      const body = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toBe("Cron no configurado en producción.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería reconciliar las filas en riesgo y contar las activadas",
  async () =>
  {
    stubBarrido([
      { id: "neg-1", suscripcion_mp_id: "pre-1" },
      { id: "neg-2", suscripcion_mp_id: "pre-2" },
      { id: "sin-preapproval", suscripcion_mp_id: null },
    ]);
    mockVerificar
      .mockResolvedValueOnce({ status: "authorized", activo: true, nextPaymentDate: null })
      .mockResolvedValueOnce({ status: "cancelled", activo: false, nextPaymentDate: null });

    const response = await POST(requestWith());
    const body = await response.json() as { revisadas: number; activadas: number; errores: number };

    expect(body).toMatchObject({ success: true, revisadas: 2, activadas: 1, errores: 0 });
    expect(mockVerificar).toHaveBeenCalledTimes(2);
    expect(mockVerificar).toHaveBeenCalledWith("neg-1", "pre-1", expect.any(Date));
  });

  it("debería sincronizar promociones sin cortar el barrido principal",
  async () =>
  {
    stubBarrido([]);
    mockPromociones.mockResolvedValue({ revisadas: 2, sincronizadas: 1, errores: 1 });

    const response = await POST(requestWith());
    const body = await response.json() as {
      promociones: { revisadas: number; sincronizadas: number; errores: number };
    };

    expect(body.promociones).toEqual({ revisadas: 2, sincronizadas: 1, errores: 1 });
    expect(mockPromociones).toHaveBeenCalledWith(expect.any(Date));
  });

  it("debería aislar el error de un negocio sin cortar el barrido",
  async () =>
  {
    stubBarrido([
      { id: "neg-1", suscripcion_mp_id: "pre-1" },
      { id: "neg-2", suscripcion_mp_id: "pre-2" },
    ]);
    mockVerificar
      .mockRejectedValueOnce(new Error("MP caído"))
      .mockResolvedValueOnce({ status: "authorized", activo: true, nextPaymentDate: null });

    const response = await POST(requestWith());
    const body = await response.json() as { activadas: number; errores: number };

    expect(body).toMatchObject({ success: true, revisadas: 2, activadas: 1, errores: 1 });
  });
});

describe("GET /api/cron/suscripciones",
() =>
{
  it("debería responder salud ok",
  async () =>
  {
    const response = await GET();
    const body = await response.json() as { status: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});
