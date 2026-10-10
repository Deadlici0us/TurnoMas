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

  it("debería filtrar slots sin fechas de texto",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({
      calendars: { primary: { busy: [{ start: 123, end: null }, { start: "mala-fecha", end: "otra" }] } },
    }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();
      const busy = await adapter.queryFreeBusy(new Date(), new Date(), "token");

      expect(busy).toEqual([]);
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar en español si Google rechaza el listado",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.listEvents(new Date(), new Date(), "token"))
        .rejects.toThrow("No pudimos leer los eventos");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });
});

describe("GoogleCalendarAdapter escritura",
() =>
{
  function eventoBase()
  {
    return {
      titulo: "Corte en Barbería",
      descripcion: "Reserva TurnoMas",
      ubicacion: "Barbería",
      inicio: new Date("2026-10-05T14:00:00.000Z"),
      fin: new Date("2026-10-05T14:30:00.000Z"),
    };
  }

  it("debería crear el evento y devolver el id",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({ id: "evt-1" }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();
      const result = await adapter.createEvent(eventoBase(), "token");

      expect(result).toEqual({ id: "evt-1" });
      expect(fetchFn.mock.calls[0]?.[0]).toContain("/calendars/primary/events");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar cuando la creación responde no-ok",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.createEvent(eventoBase(), "token"))
        .rejects.toThrow("No pudimos crear el evento en Google Calendar.");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar con respuesta de creación inválida",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({ sin_id: true }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.createEvent(eventoBase(), "token"))
        .rejects.toThrow("Respuesta inválida de Google Calendar");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería actualizar el evento",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({}));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.updateEvent("evt-1", eventoBase(), "token")).resolves.toBeUndefined();
      expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH" });
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar cuando la actualización responde no-ok",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.updateEvent("evt-1", eventoBase(), "token"))
        .rejects.toThrow("No pudimos actualizar el evento en Google Calendar.");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería borrar el evento",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.deleteEvent("evt-1", "token")).resolves.toBeUndefined();
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería tolerar borrado de evento inexistente (404)",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.deleteEvent("evt-1", "token")).resolves.toBeUndefined();
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería filtrar eventos con fechas inválidas",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue(respuestaOk({
      items: [{ id: "evt-malo", start: { dateTime: "mala-fecha" }, end: { dateTime: "peor" } }],
    }));
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();
      const eventos = await adapter.listEvents(new Date(), new Date(), "token");

      expect(eventos).toEqual([]);
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });

  it("debería lanzar cuando el borrado responde error",
  async () =>
  {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const anterior = globalThis.fetch;

    globalThis.fetch = fetchFn as unknown as typeof fetch;

    try
    {
      const adapter = new GoogleCalendarAdapter();

      await expect(adapter.deleteEvent("evt-1", "token"))
        .rejects.toThrow("No pudimos borrar el evento en Google Calendar.");
    }
    finally
    {
      globalThis.fetch = anterior;
    }
  });
});
