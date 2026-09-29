import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

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

  it("debería responder sin base en modo demo",
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
});
