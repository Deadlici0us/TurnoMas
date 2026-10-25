import { describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { resolverBaseResena } from "./helpers";

describe("resolverBaseResena",
() =>
{
  it("debería preferir la URL pública configurada",
  () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://turnomas.com/");
    vi.stubEnv("VERCEL_URL", "otro.vercel.app");

    try
    {
      expect(resolverBaseResena()).toBe("https://turnomas.com");
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });

  it("debería devolver null sin ninguna URL",
  () =>
  {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    try
    {
      expect(resolverBaseResena()).toBeNull();
    }
    finally
    {
      vi.unstubAllEnvs();
    }
  });
});

describe("POST /api/cron/resenas",
() =>
{
  it("debería rechazar firma inválida con secreto configurado",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "clave-de-test-qstash");

    try
    {
      const request = new Request("http://localhost/api/cron/resenas",
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

  it("debería responder sin base disponible",
  async () =>
  {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://test.local");

    try
    {
      const request = new Request("http://localhost/api/cron/resenas", { method: "POST" });
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
      const request = new Request("http://localhost/api/cron/resenas", { method: "POST" });
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
});
