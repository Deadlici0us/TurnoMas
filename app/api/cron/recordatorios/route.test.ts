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

function requestSinFirma(): Request
{
  return new Request("http://localhost/api/cron/recordatorios", { method: "POST" });
}

/** Turno candidato con inicio en `horasFuturo` horas. */
function turnoCandidato(horasFuturo: number, overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    cliente_id: "c-1",
    inicio: new Date(Date.now() + horasFuturo * 3_600_000).toISOString(),
    notificacion_enviada: false,
    negocio: {
      nombre: "Barbería",
      timezone: "America/Argentina/Buenos_Aires",
      pais: "ar",
      recordatorio_activo: true,
      recordatorio_hs: 24,
      msg_recordatorio_subject: null,
      msg_recordatorio_cuerpo: null,
    },
    servicio: { nombre: "Corte" },
    staff: { nombre: "Diego" },
    cliente: { email: "cli@ejemplo.com" },
    ...overrides,
  };
}

/**
 * Stub del admin para el barrido de recordatorios.
 *
 * @param filas Turnos devueltos por el barrido.
 * @param updates Flags actualizados capturados.
 */
function stubBarrido(filas: unknown[], updates: unknown[] = [])
{
  const admin = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: filas })),
              })),
            })),
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

describe("POST /api/cron/recordatorios",
() =>
{
  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "clave-de-test-qstash");

    try
    {
      const request = new Request("http://localhost/api/cron/recordatorios",
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
      const response = await POST(requestSinFirma());
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
      const response = await POST(requestSinFirma());
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

  it("debería enviar recordatorio dentro de la ventana y marcarlo",
  async () =>
  {
    const updates: unknown[] = [];
    stubBarrido([turnoCandidato(12)], updates);
    mockEmailSend.mockResolvedValueOnce("email-1");

    const response = await POST(requestSinFirma());
    const body = await response.json() as { enviados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, enviados: 1 });
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "cli@ejemplo.com" }));
    expect(updates).toEqual([{ notificacion_enviada: true }]);
  });

  it("debería omitir turnos fuera de la ventana",
  async () =>
  {
    stubBarrido([turnoCandidato(30)]);

    const response = await POST(requestSinFirma());
    const body = await response.json() as { enviados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ enviados: 0 });
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería omitir negocios con recordatorios desactivados",
  async () =>
  {
    stubBarrido([turnoCandidato(12, {
      negocio: { nombre: "Barbería", recordatorio_activo: false },
    })]);

    const response = await POST(requestSinFirma());
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 0 });
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería omitir clientes sin email",
  async () =>
  {
    stubBarrido([turnoCandidato(12, { cliente: { email: null } })]);

    const response = await POST(requestSinFirma());
    const body = await response.json() as { enviados: number };

    expect(body).toMatchObject({ enviados: 0 });
    expect(mockEmailSend).not.toHaveBeenCalled();
  });

  it("debería continuar aunque un envío falle (best-effort)",
  async () =>
  {
    stubBarrido([turnoCandidato(12)]);
    mockEmailSend.mockRejectedValueOnce(new Error("resend caído"));

    const response = await POST(requestSinFirma());
    const body = await response.json() as { enviados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, enviados: 0 });
  });

  it("debería incluir el link de cancelación cuando hay secreto y base",
  async () =>
  {
    stubBarrido([turnoCandidato(12)]);
    mockEmailSend.mockResolvedValueOnce("email-1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com");
    vi.stubEnv("CANCELACION_SECRET", "secreto-de-test-suficiente");

    try
    {
      const response = await POST(requestSinFirma());
      const body = await response.json() as { enviados: number };

      expect(body).toMatchObject({ enviados: 1 });
      const html = (mockEmailSend.mock.calls[0][0] as { html: string }).html;
      expect(html).toContain("https://turnomas.com/cancelar/t-1?token=");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });
});
