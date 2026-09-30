import { describe, expect, it } from "vitest";

import { FakeCalendarProvider } from "./calendar";

function inicioFin()
{
  const inicio = new Date("2026-10-05T14:00:00.000Z");
  const fin = new Date("2026-10-05T15:00:00.000Z");

  return { inicio, fin };
}

describe("FakeCalendarProvider",
() =>
{
  it("debería crear un evento con id",
  async () =>
  {
    const provider = new FakeCalendarProvider();
    const { inicio, fin } = inicioFin();

    const created = await provider.createEvent({ titulo: "Corte en Barbería Diego", inicio, fin }, "token");

    expect(created.id).toContain("fake-event-");
    expect(provider.created).toHaveLength(1);
  });

  it("debería rechazar títulos vacíos",
  async () =>
  {
    const provider = new FakeCalendarProvider();
    const { inicio, fin } = inicioFin();

    await expect(provider.createEvent({ titulo: "  ", inicio, fin }, "token")).rejects.toThrow(RangeError);
  });

  it("debería registrar updates y deletes",
  async () =>
  {
    const provider = new FakeCalendarProvider();
    const { inicio, fin } = inicioFin();

    await provider.updateEvent("evt-1", { titulo: "Nuevo", inicio, fin }, "token");
    await provider.deleteEvent("evt-1", "token");

    expect(provider.updated).toHaveLength(1);
    expect(provider.deleted).toEqual(["evt-1"]);
  });
});
