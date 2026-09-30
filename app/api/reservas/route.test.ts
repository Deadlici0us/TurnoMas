import { describe, expect, it } from "vitest";

import { POST } from "./route";

function requestWith(body: unknown): Request
{
  return new Request("http://localhost/api/reservas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BASE = {
  pais: "ar",
  slug: "barberia-diego",
  staffId: "d0e6b000-0000-4000-8000-000000000011",
  servicioId: "d0e6b000-0000-4000-8000-000000000021",
  inicio: new Date(Date.now() + 86_400_000).toISOString(),
  nombre: "Juan Pérez",
  whatsapp: "+549110000001",
};

describe("POST /api/reservas",
() =>
{
  it("debería exigir nombre en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, nombre: " " }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Contanos tu nombre para confirmar la reserva.");
  });

  it("debería exigir whatsapp válido en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, whatsapp: "abc" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Revisá tu WhatsApp para que te lleguen los recordatorios.");
  });

  it("debería exigir inicio futuro en español",
  async () =>
  {
    const response = await POST(requestWith({ ...BASE, inicio: "no-fecha" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Elegí un horario válido para tu reserva.");
  });

  it("debería exigir 30 min de anticipación en español",
  async () =>
  {
    const response = await POST(requestWith(
      { ...BASE, inicio: new Date(Date.now() + 10 * 60_000).toISOString() }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Elegí un horario con al menos 30 min de anticipación.");
  });
});
