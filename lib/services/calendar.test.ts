import { describe, expect, it, vi } from "vitest";

import { buildTurnoEvent, CalendarService } from "./calendar";
import type { CalendarExternalEvent } from "@/lib/ports/calendar";
import { FakeCalendarProvider } from "@/lib/ports/calendar";

/** Servicio con refresh token fijo para tests sin red ni Supabase. */
class TestCalendarService extends CalendarService
{
  override async getRefreshToken(): Promise<string>
  {
    return "refresh-test";
  }
}

function servicioFake(): { service: TestCalendarService; fake: FakeCalendarProvider }
{
  vi.stubEnv("GOOGLE_CLIENT_ID", "cid-test");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "sec-test");

  const fake = new FakeCalendarProvider();
  const service = new TestCalendarService(fake, async () => "access-test");

  return { service, fake };
}

function turnoBase()
{
  return {
    negocio: "Barbería Diego",
    servicio: "Corte clásico",
    profesional: "Diego",
    cliente: "Juan Pérez",
    whatsapp: "+549110000001",
    inicio: new Date("2026-10-05T14:00:00.000Z"),
    fin: new Date("2026-10-05T14:30:00.000Z"),
  };
}

describe("buildTurnoEvent",
() =>
{
  it("debería armar título y descripción trazable del turno",
  () =>
  {
    const evento = buildTurnoEvent(turnoBase());

    expect(evento.titulo).toBe("Corte clásico en Barbería Diego · Juan Pérez");
    expect(evento.descripcion).toContain("Reserva TurnoMas");
    expect(evento.descripcion).toContain("Diego");
    expect(evento.ubicacion).toBe("Barbería Diego");
  });
});

describe("CalendarService",
() =>
{
  it("debería crear eventos y devolver el id",
  async () =>
  {
    const { service, fake } = servicioFake();

    const id = await service.createEventForNegocio("neg-1", buildTurnoEvent(turnoBase()));

    expect(id).toContain("fake-event-");
    expect(fake.created).toHaveLength(1);
  });

  it("debería actualizar y borrar eventos sin lanzar",
  async () =>
  {
    const { service, fake } = servicioFake();

    await service.updateEventForNegocio("neg-1", "evt-1", buildTurnoEvent(turnoBase()));
    await service.deleteEventForNegocio("neg-1", "evt-1");

    expect(fake.updated).toHaveLength(1);
    expect(fake.deleted).toEqual(["evt-1"]);
  });

  it("debería devolver la ocupación de Google para bloquear agenda",
  async () =>
  {
    const { service, fake } = servicioFake();

    fake.busy.push({
      start: new Date("2026-10-05T16:00:00.000Z"),
      end: new Date("2026-10-05T17:00:00.000Z"),
    });

    const busy = await service.getBusyIntervalsForNegocio(
      "neg-1", new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-06T00:00:00.000Z"));

    expect(busy).toHaveLength(1);
    expect(busy[0]?.start.toISOString()).toBe("2026-10-05T16:00:00.000Z");
  });

  it("debería filtrar eventos propios de TurnoMas en la grilla",
  async () =>
  {
    const { service, fake } = servicioFake();
    const propio: CalendarExternalEvent = {
      id: "evt-propio",
      titulo: "Corte clásico en Barbería Diego · Juan Pérez",
      descripcion: "Reserva TurnoMas · Corte con Diego",
      inicio: new Date("2026-10-05T14:00:00.000Z"),
      fin: new Date("2026-10-05T14:30:00.000Z"),
    };
    const ajeno: CalendarExternalEvent = {
      id: "evt-ajeno",
      titulo: "Dentista",
      descripcion: null,
      inicio: new Date("2026-10-05T16:00:00.000Z"),
      fin: new Date("2026-10-05T17:00:00.000Z"),
    };

    fake.external.push(propio, ajeno);

    const eventos = await service.getExternalEventsForNegocio(
      "neg-1", new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-06T00:00:00.000Z"));

    expect(eventos.map((e) => e.id)).toEqual(["evt-ajeno"]);
  });

  it("debería fail-open sin refresh token (sin conexión)",
  async () =>
  {
    const fake = new FakeCalendarProvider();
    const service = new CalendarService(fake, async () => "access-test");

    expect(await service.createEventForNegocio("neg-1", buildTurnoEvent(turnoBase()))).toBeNull();
    expect(await service.getBusyIntervalsForNegocio(
      "neg-1", new Date(), new Date())).toEqual([]);
    expect(await service.getExternalEventsForNegocio(
      "neg-1", new Date(), new Date())).toEqual([]);
    expect(fake.created).toHaveLength(0);
  });
});
