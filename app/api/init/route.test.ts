import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/init",
() =>
{
  it("debería rechazar el seed sin DEMO_DUENIO_ID configurado",
  async () =>
  {
    const previous = process.env.DEMO_DUENIO_ID;
    delete process.env.DEMO_DUENIO_ID;

    try
    {
      const response = await POST();
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(400);
      expect(body).toEqual({
        ok: false,
        seeded: false,
        error: "Seed omitido: falta DEMO_DUENIO_ID en el entorno.",
      });
    }
    finally
    {
      if (previous !== undefined)
      {
        process.env.DEMO_DUENIO_ID = previous;
      }
    }
  });
});
