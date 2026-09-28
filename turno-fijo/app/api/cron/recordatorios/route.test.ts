import { describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

function requestSinFirma(): Request
{
  return new Request("http://localhost/api/cron/recordatorios", { method: "POST" });
}

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

  it("debería exponer estado vía GET",
  async () =>
  {
    const response = await GET();
    const body = await response.json() as { status: string };

    expect(body.status).toBe("ok");
  });
});
