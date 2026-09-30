import { describe, expect, it, vi } from "vitest";

import { GoogleCalendarAdapter } from "./google-calendar";

function respuestaOk(json: unknown)
{
  return { ok: true, status: 200, json: async () => json };
}

describe("GoogleCalendarAdapter lectura",
() =>
{
  it("debería parsear freebusy del primario",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({
      calendars: { primary: { busy: [{ start: "2026-10-05T16:00:00.000Z", end: "2026-10-05T17:00:00.000Z" }] } },
    }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();
      const busy = await adapter.queryFreeBusy(
        new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-06T00:00:00.000Z"), "token");

      expect(busy).toHaveLength(1);
      expect(busy[0]?.start.toISOString()).toBe("2026-10-05T16:00:00.000Z");
      expect(fetchFn.mock.calls[0]?.[0]).toContain("/freeBusy");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería listar eventos con título y fechas válidas",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({
      items: [
        {
          id: "evt-1",
          summary: "Dentista",
          start: { dateTime: "2026-10-05T16:00:00.000Z" },
          end: { dateTime: "2026-10-05T17:00:00.000Z" },
        },
        { id: "evt-roto", summary: "Sin fechas" },
      ],
    }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();
      const eventos = await adapter.listEvents(
        new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-06T00:00:00.000Z"), "token");

      expect(eventos.map((e) => e.id)).toEqual(["evt-1"]);
      expect(eventos[0]?.titulo).toBe("Dentista");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar en español si Google rechaza la lectura",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.queryFreeBusy(new Date(), new Date(), "token"))
        .rejects.toThrow("No pudimos leer la ocupación");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });
});
