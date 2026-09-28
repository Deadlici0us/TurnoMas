import { describe, expect, it } from "vitest";

import { POST } from "./route";

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout",
() =>
{
  it("debería confirmar sin seña en español",
  async () =>
  {
    const response = await POST(requestWith({
      serviceRequiresDeposit: false,
      serviceDepositPercentage: 50,
      blacklistDecision: "allowed",
    }));
    const body = await response.json() as { success: boolean; action: string };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe("confirm");
  });

  it("debería rechazar lista negra bloqueada con 403",
  async () =>
  {
    const response = await POST(requestWith({
      serviceRequiresDeposit: false,
      serviceDepositPercentage: 50,
      blacklistDecision: "blocked",
    }));

    expect(response.status).toBe(403);
  });

  it("debería exigir bookingId y monto para crear preferencia",
  async () =>
  {
    const response = await POST(requestWith({
      serviceRequiresDeposit: true,
      serviceDepositPercentage: 50,
      blacklistDecision: "allowed",
    }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("La reserva requiere un identificador válido.");
  });
});
