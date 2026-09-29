import { describe, expect, it } from "vitest";

import { POST } from "./route";

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/api/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks",
() =>
{
  it("debería rechazar un tipo inválido en español",
  async () =>
  {
    const response = await POST(requestWith({ type: "otro" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Tipo de webhook inválido.");
  });

  it("debería rechazar sin ID de pago en español",
  async () =>
  {
    const response = await POST(requestWith({ type: "payment", data: {} }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Falta el ID del pago.");
  });
});
