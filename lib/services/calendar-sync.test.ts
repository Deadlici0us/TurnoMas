import { beforeEach, describe, expect, it, vi } from "vitest";

import { calendarService } from "@/lib/services/calendar";
import { crearEventoGoogleParaTurno, resolverFinTurno } from "./calendar-sync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () =>
{
  return { getSupabaseAdmin: vi.fn() };
});

const mockGetSupabaseAdmin = vi.mocked(getSupabaseAdmin);

const TURNO_BASE = "2026-10-10T14:00:00.000Z";

/**
 * Arma un admin cuyo `from(tabla)` responde con `tablas[tabla]`.
 *
 * @param tablas Datos por tabla para `.single()`.
 * @param updateSpy Espía opcional del `.update()` de turnos.
 */
function stubTablas(tablas: Record<string, unknown>, updateSpy?: (values: unknown) => void)
{
  const admin = {
    from: vi.fn((tabla: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: async () => ({ data: tablas[tabla] ?? null }),
        })),
      })),
      update: vi.fn((values: unknown) =>
      {
        updateSpy?.(values);

        return { eq: vi.fn(async () => ({ error: null })) };
      }),
    })),
  };

  mockGetSupabaseAdmin.mockReturnValue(admin as never);

  return admin;
}

/** Fila de turno válida con identidades de texto. */
function turnoValido(overrides: Record<string, unknown> = {})
{
  return {
    negocio_id: "neg-1",
    staff_id: "staff-1",
    servicio_id: "serv-1",
    cliente_id: "cli-1",
    inicio: TURNO_BASE,
    fin: "2026-10-10T14:30:00.000Z",
    google_calendar_event_id: null,
    ...overrides,
  };
}

beforeEach(() =>
{
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("resolverFinTurno",
() =>
{
  it("debería respetar el fin persistido cuando es válido",
  () =>
  {
    const inicio = new Date(TURNO_BASE);
    const finRaw = new Date("2026-10-10T15:00:00.000Z");

    expect(resolverFinTurno(finRaw, inicio, 60)).toBe(finRaw);
  });

  it("debería sumar la duración del servicio sin fin persistido",
  () =>
  {
    const inicio = new Date(TURNO_BASE);

    expect(resolverFinTurno(null, inicio, 60).toISOString()).toBe("2026-10-10T15:00:00.000Z");
  });

  it("debería caer a 30 minutos sin duración numérica",
  () =>
  {
    const inicio = new Date(TURNO_BASE);

    expect(resolverFinTurno(null, inicio, "60").toISOString()).toBe("2026-10-10T14:30:00.000Z");
    expect(resolverFinTurno(null, inicio, null).toISOString()).toBe("2026-10-10T14:30:00.000Z");
  });

  it("debería caer a la duración ante un fin inválido",
  () =>
  {
    const inicio = new Date(TURNO_BASE);

    expect(resolverFinTurno(new Date("no-fecha"), inicio, 45).toISOString())
      .toBe("2026-10-10T14:45:00.000Z");
  });
});

describe("crearEventoGoogleParaTurno guardas",
() =>
{
  it("debería no hacer nada sin turno",
  async () =>
  {
    const admin = stubTablas({ turnos: null });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("missing")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
    expect(admin.from).toHaveBeenCalledWith("turnos");
  });

  it("debería no hacer nada sin negocio_id de texto",
  async () =>
  {
    stubTablas({ turnos: { negocio_id: 123 } });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("debería no duplicar cuando ya tiene evento de Google",
  async () =>
  {
    stubTablas({ turnos: turnoValido({ google_calendar_event_id: "evt-previo" }) });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("debería no hacer nada con inicio inválido",
  async () =>
  {
    stubTablas({
      turnos: turnoValido({ inicio: "no-fecha" }),
      negocios: { nombre: "Barbería", timezone: "America/Argentina/Buenos_Aires", pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 30 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("debería no hacer nada sin inicio de texto",
  async () =>
  {
    stubTablas({ turnos: turnoValido({ inicio: 12345 }) });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("debería nunca lanzar ante fallas de Supabase",
  async () =>
  {
    mockGetSupabaseAdmin.mockImplementation(() =>
    {
      throw new Error("supabase caído");
    });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe("crearEventoGoogleParaTurno flujo feliz",
() =>
{
  it("debería crear el evento y persistir su id",
  async () =>
  {
    const updates: unknown[] = [];
    stubTablas({
      turnos: turnoValido(),
      negocios: { nombre: "Barbería", timezone: "America/Argentina/Buenos_Aires", pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 30 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    }, (values) => updates.push(values));
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockResolvedValueOnce("evt-1");

    await crearEventoGoogleParaTurno("t-1");

    expect(createSpy).toHaveBeenCalledWith("neg-1", expect.objectContaining({
      timeZone: "America/Argentina/Buenos_Aires",
    }));
    expect(updates).toEqual([{ google_calendar_event_id: "evt-1" }]);
  });

  it("debería calcular el fin desde la duración sin fin persistido",
  async () =>
  {
    stubTablas({
      turnos: turnoValido({ fin: null }),
      negocios: { nombre: "Barbería", timezone: null, pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 60 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockResolvedValueOnce("evt-2");

    await crearEventoGoogleParaTurno("t-1");

    expect(createSpy).toHaveBeenCalledOnce();
    const input = (createSpy.mock.calls[0] as unknown[])[1] as { fin: Date };

    expect(input.fin.toISOString()).toBe("2026-10-10T15:00:00.000Z");
  });

  it("debería tolerar relaciones ausentes con defaults",
  async () =>
  {
    stubTablas({
      turnos: turnoValido({ staff_id: null, servicio_id: null, cliente_id: null }),
      negocios: null,
      staff: null,
      servicios: null,
      clientes: null,
    });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockResolvedValueOnce("evt-3");

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(createSpy).toHaveBeenCalledOnce();
  });

  it("debería no persistir cuando Google no devuelve id",
  async () =>
  {
    const updates: unknown[] = [];
    stubTablas({
      turnos: turnoValido(),
      negocios: { nombre: "Barbería", timezone: null, pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 30 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    }, (values) => updates.push(values));
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockResolvedValueOnce(null);

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
    expect(updates).toHaveLength(0);
  });

  it("debería tragar errores de Google sin lanzar",
  async () =>
  {
    stubTablas({
      turnos: turnoValido(),
      negocios: { nombre: "Barbería", timezone: null, pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 30 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    });
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockRejectedValueOnce(new Error("google caído"));

    await expect(crearEventoGoogleParaTurno("t-1")).resolves.toBeUndefined();
  });
});

describe("crearEventoGoogleParaTurno integración",
() =>
{
  it("debería sincronizar punta a punta con Supabase y calendario mockeados",
  async () =>
  {
    const updates: unknown[] = [];
    const admin = stubTablas({
      turnos: turnoValido(),
      negocios: { nombre: "Barbería", timezone: "America/Argentina/Buenos_Aires", pais: "ar" },
      staff: { nombre: "Diego" },
      servicios: { nombre: "Corte", duracion_min: 30 },
      clientes: { nombre: "Juan", whatsapp: "+549110000001" },
    }, (values) => updates.push(values));
    const createSpy = vi.spyOn(calendarService, "createEventForNegocio");
    createSpy.mockResolvedValueOnce("evt-int");

    await crearEventoGoogleParaTurno("t-int");

    expect(admin.from).toHaveBeenCalledWith("turnos");
    expect(admin.from).toHaveBeenCalledWith("negocios");
    expect(createSpy).toHaveBeenCalledWith("neg-1", expect.objectContaining({
      titulo: expect.stringContaining("Corte") as string,
    }));
    expect(updates).toEqual([{ google_calendar_event_id: "evt-int" }]);
  });
});
