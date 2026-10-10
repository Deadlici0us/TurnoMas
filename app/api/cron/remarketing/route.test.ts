import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const { mockEmailSend } = vi.hoisted(() =>
{
  return { mockEmailSend: vi.fn() };
});

vi.mock("@/lib/ports/email", () =>
{
  return {
    ResendAdapter: function ()
    {
      return { send: mockEmailSend };
    },
  };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/api/cron/remarketing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Turno completado hace `diasAtras` días. */
function turnoCompletado(diasAtras: number, overrides: Record<string, unknown> = {})
{
  const fin = new Date(Date.now() - diasAtras * 86_400_000).toISOString();

  return {
    id: "t-1",
    inicio: fin,
    fin,
    remarketing_enviado: false,
    negocio: {
      nombre: "Barbería",
      pais: "ar",
      slug: "barberia",
      remarketing_activo: true,
      remarketing_dias: 30,
      msg_remarketing_subject: null,
      msg_remarketing_cuerpo: null,
    },
    servicio: { nombre: "Corte", remarketing: true, remarketing_dias: null },
    staff: { nombre: "Diego" },
    cliente: { email: "cli@ejemplo.com" },
    ...overrides,
  };
}

/**
 * Stub del admin para el barrido de remarketing.
 *
 * @param filas Turnos devueltos por el barrido.
 * @param updates Flags actualizados capturados.
 */
function stubBarrido(filas: unknown[], updates: unknown[] = [])
{
  const admin = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: filas })),
          })),
        })),
      })),
      update: vi.fn((values: unknown) =>
      {
        updates.push(values);

        return { eq: vi.fn(async () => ({ error: null })) };
      }),
    })),
  };

  mockAdmin.mockReturnValue(admin as never);
}

beforeEach(() =>
{
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mockAdmin.mockImplementation(() =>
  {
    throw new Error("Falta configurar Supabase en el entorno (URL y clave de servicio).");
  });
});

describe("POST /api/cron/remarketing",
() =>
{
  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "clave-de-test-qstash");

    try
    {
      const request = new Request("http://localhost/api/cron/remarketing",
        { method: "POST", headers: { "upstash-signature": "firma.invalida.test" } });
      const response = await POST(request);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe("Firma de QStash inválida.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería responder sin base en modo demo",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");

    try
    {
      const request = new Request("http://localhost/api/cron/remarketing", { method: "POST" });
      const response = await POST(request);
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
      const request = new Request("http://localhost/api/cron/remarketing", { method: "POST" });
      const response = await POST(request);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toBe("Cron no configurado en producción.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería exponer estado vía GET",
  async () =>
  {
    const response = await GET();
    const body = await response.json() as { status: string };

    expect(body.status).toBe("ok");
  });

  it("debería enviar remarketing vencido y marcarlo",
  async () =>
  {
    const updates: unknown[] = [];
    stubBarrido([turnoCompletado(40)], updates);
    mockEmailSend.mockResolvedValueOnce("email-1");

    const response = await POST(requestWith({}));
    const body = await response.json() as { enviados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, enviados: 1 });
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "cli@ejemplo.com" }));
    expect(updates).toEqual([{ remarketing_enviado: true }]);
  });

  it("debería respetar diasEspera del cuerpo",
  async () =>
  {
    const turno = turnoCompletado(10);
    stubBarrido([{
      ...turno,
      negocio: { ...turno.negocio, remarketing_dias: null },
      servicio: { nombre: "Corte", remarketing: true, remarketing_dias: null },
    }]);

    const response = await POST(requestWith({ diasEspera: 7 }));
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 1 });
  });

  it("debería usar 30 días con cuerpo ilegible",
  async () =>
  {
    stubBarrido([turnoCompletado(40)]);

    const request = new Request("http://localhost/api/cron/remarketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 1 });
  });

  it("debería omitir servicios con remarketing desactivado",
  async () =>
  {
    stubBarrido([turnoCompletado(40, { servicio: { nombre: "Corte", remarketing: false } })]);

    const response = await POST(requestWith({}));
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 0 });
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería omitir negocios con remarketing desactivado",
  async () =>
  {
    const turno = turnoCompletado(40);
    stubBarrido([{ ...turno, negocio: { ...turno.negocio, remarketing_activo: false } }]);

    const response = await POST(requestWith({}));
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 0 });
  });

  it("debería omitir clientes sin email",
  async () =>
  {
    stubBarrido([turnoCompletado(40, { cliente: { email: null } })]);

    const response = await POST(requestWith({}));
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 0 });
  });

  it("debería continuar aunque un envío falle (best-effort)",
  async () =>
  {
    stubBarrido([turnoCompletado(40)]);
    mockEmailSend.mockRejectedValueOnce(new Error("resend caído"));

    const response = await POST(requestWith({}));
    const body = await response.json() as { enviados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, enviados: 0 });
  });
});
