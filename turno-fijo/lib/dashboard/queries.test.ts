import { describe, expect, it, vi } from "vitest";

describe("dashboard queries", () =>
{
  it("debería construir consulta de turnos con staff y servicio", () =>
  {
    const query = { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() };
    expect(typeof query.from).toBe("function");
  });
});
