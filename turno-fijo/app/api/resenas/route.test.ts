import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

function post(body: unknown): Request
{
  return new Request("http://localhost/api/resenas",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/resenas",
() =>
{
  it("debería exigir turno y estrellas válidas",
  async () =>
  {
    const sinTurno = await POST(post({ estrellas: 5 }));
    expect(sinTurno.status).toBe(400);

    const sinEstrellas = await POST(post({ turnoId: "t-1" }));
    expect(sinEstrellas.status).toBe(400);

    const fueraDeRango = await POST(post({ turnoId: "t-1", estrellas: 7 }));
    const body = await fueraDeRango.json() as { error: string };
    expect(fueraDeRango.status).toBe(400);
    expect(body.error).toBe("Elegí de 1 a 5 estrellas.");
  });

  it("debería responder sin base en modo demo",
  async () =>
  {
    const response = await POST(post({ turnoId: "t-1", estrellas: 5 }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Calificación no disponible ahora.");
  });

  it("debería exponer estado vía GET",
  async () =>
  {
    const response = await GET();
    const body = await response.json() as { status: string };

    expect(body.status).toBe("ok");
  });
});
