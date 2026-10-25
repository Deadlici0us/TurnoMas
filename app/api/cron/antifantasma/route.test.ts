import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockAdmin = vi.mocked(getSupabaseAdmin);

function requestWith(body: unknown, firma: string | null = null): Request
{
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (firma !== null)
  {
    headers["upstash-signature"] = firma;
  }

  return new Request("http://localhost/api/cron/antifantasma", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** Turno pendiente con seña creado hace `minutosAtras` minutos. */
function turnoVencido(minutosAtras: number, overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    negocio_id: "neg-1",
    created_at: new Date(Date.now() - minutosAtras * 60_000).toISOString(),
    estado: "pendiente",
    sena_monto: 5000,
    ...overrides,
  };
}

/**
 * Stub del admin para el antifantasma.
 *
 * @param turno Fila para la búsqueda por id.
 * @param barrido Filas para el barrido global.
 * @param updates Estados actualizados capturados.
 * @param filasAfectadas Filas que devuelve el update condicional (vacío = otro proceso ganó la carrera).
 * @param eqArgs Pares [columna, valor] de los eq encadenados capturados.
 */
function stubAntifantasma(
  turno: unknown,
  barrido: unknown[] = [],
  updates: unknown[] = [],
  filasAfectadas: unknown[] = [{ id: "t-1" }],
  eqArgs: Array<[string, unknown]> = [],
)
{
  const final = async () => ({ error: null, data: filasAfectadas });
  const admin = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: turno }),
          }),
          single: async () => ({ data: turno }),
          not: () => ({
            lt: () => ({
              limit: async () => ({ data: barrido }),
            }),
          }),
        }),
        single: async () => ({ data: turno }),
      }),
      update: (values: unknown) =>
      {
        updates.push(values);

        const encadenar = (columna: string, valor: unknown): unknown =>
        {
          eqArgs.push([columna, valor]);

          return { eq: encadenar, select: final };
        };

        return { eq: encadenar };
      },
    })),
  };

  mockAdmin.mockReturnValue(admin as never);

  return admin;
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

describe("POST /api/cron/antifantasma",
() =>
{
  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "clave-de-test-qstash");

    try
    {
      const response = await POST(requestWith({ turnoId: "t-1" }, "firma.invalida.test"));
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
      const response = await POST(requestWith({}));
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
      const response = await POST(requestWith({}));
      const body = await response.json() as { error: string };

      expect(response.status).toBe(503);
      expect(body.error).toBe("Cron no configurado en producción.");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería responder sin-turno cuando no existe",
  async () =>
  {
    stubAntifantasma(null);

    const response = await POST(requestWith({ turnoId: "missing" }));
    const body = await response.json() as { motivo: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberado: false, motivo: "sin-turno" });
  });

  it("debería responder sin-deuda para turnos sin seña",
  async () =>
  {
    stubAntifantasma(turnoVencido(30, { estado: "confirmado", sena_monto: null }));

    const response = await POST(requestWith({ turnoId: "t-1" }));
    const body = await response.json() as { motivo: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ liberado: false, motivo: "sin-deuda" });
  });

  it("debería responder en-gracia dentro de los 15 minutos",
  async () =>
  {
    stubAntifantasma(turnoVencido(5));

    const response = await POST(requestWith({ turnoId: "t-1" }));
    const body = await response.json() as { motivo: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ liberado: false, motivo: "en-gracia" });
  });

  it("debería liberar el turno vencido con seña",
  async () =>
  {
    const updates: unknown[] = [];
    stubAntifantasma(turnoVencido(30), [], updates);

    const response = await POST(requestWith({ turnoId: "t-1" }));
    const body = await response.json() as { liberado: boolean };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberado: true });
    expect(updates).toEqual([{ estado: "cancelado" }]);
  });

  it("debería tolerar cuerpo ilegible como barrido",
  async () =>
  {
    stubAntifantasma(null, []);

    const request = new Request("http://localhost/api/cron/antifantasma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json{",
    });
    const response = await POST(request);
    const body = await response.json() as { liberados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberados: 0 });
  });

  it("debería barrer vencidos en modo global",
  async () =>
  {
    const updates: unknown[] = [];
    stubAntifantasma(null, [turnoVencido(30), turnoVencido(5)], updates);

    const response = await POST(requestWith({}));
    const body = await response.json() as { liberados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberados: 1 });
    expect(updates).toEqual([{ estado: "cancelado" }]);
  });

  it("debería condicionar el update a seguir pendiente (anti-carrera con webhook)",
  async () =>
  {
    const eqArgs: Array<[string, unknown]> = [];
    stubAntifantasma(turnoVencido(30), [], [], [{ id: "t-1" }], eqArgs);

    const response = await POST(requestWith({ turnoId: "t-1" }));

    expect(response.status).toBe(200);
    expect(eqArgs).toContainEqual(["id", "t-1"]);
    expect(eqArgs).toContainEqual(["estado", "pendiente"]);
  });

  it("debería no liberar si el turno ya cambió de estado (ganó el webhook)",
  async () =>
  {
    stubAntifantasma(turnoVencido(30), [], [], []);

    const response = await POST(requestWith({ turnoId: "t-1" }));
    const body = await response.json() as { liberado: boolean; motivo: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberado: false, motivo: "ya-procesado" });
  });

  it("debería contar solo liberados reales en el barrido",
  async () =>
  {
    stubAntifantasma(null, [turnoVencido(30)], [], []);

    const response = await POST(requestWith({}));
    const body = await response.json() as { liberados: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, liberados: 0 });
  });
});

describe("GET /api/cron/antifantasma",
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
