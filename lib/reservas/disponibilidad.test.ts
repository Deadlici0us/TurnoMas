import { afterEach, describe, expect, it, vi } from "vitest";

import { estaOcupado } from "@/lib/reservas/disponibilidad";
import { calendarService } from "@/lib/services/calendar";

interface Filas
{
  readonly turnos?: unknown[];
  readonly servicios?: unknown[];
}

/**
 * Stub admin con queries thenables para turnos y servicios.
 *
 * @param filas Filas devueltas por tabla.
 * @return Cliente admin mínimo.
 */
function stubAdmin(filas: Filas = {})
{
  const build = (tabla: string): Record<string, unknown> =>
  {
    const query: Record<string, unknown> = {};

    for (const metodo of ["select", "eq", "gte", "order", "limit"])
    {
      query[metodo] = () => query;
    }

    query.then = (resolve: (value: unknown) => unknown) =>
      resolve({ data: (tabla === "turnos" ? filas.turnos : filas.servicios) ?? [], error: null });

    return query;
  };

  return { from: (tabla: string) => build(tabla) } as never;
}

const INICIO = new Date("2026-10-06T13:00:00.000Z");

afterEach(() =>
{
  vi.restoreAllMocks();
});

describe("estaOcupado",
() =>
{
  it("debería estar libre sin turnos ni eventos",
  async () =>
  {
    vi.spyOn(calendarService, "getBusyIntervalsForNegocio").mockResolvedValue([]);

    await expect(estaOcupado(stubAdmin(), "neg-1", "staff-1", INICIO, 30)).resolves.toBe(false);
  });

  it("debería estar ocupado si solapa un turno confirmado",
  async () =>
  {
    vi.spyOn(calendarService, "getBusyIntervalsForNegocio").mockResolvedValue([]);

    const admin = stubAdmin({
      turnos: [{
        inicio: INICIO.toISOString(),
        servicio_id: "serv-1",
        estado: "confirmado",
        created_at: new Date().toISOString(),
      }],
      servicios: [{ id: "serv-1", duracion_min: 30 }],
    });

    await expect(estaOcupado(admin, "neg-1", "staff-1", INICIO, 30)).resolves.toBe(true);
  });

  it("debería ignorar turnos cancelados y pendientes vencidos",
  async () =>
  {
    vi.spyOn(calendarService, "getBusyIntervalsForNegocio").mockResolvedValue([]);

    const admin = stubAdmin({
      turnos: [
        { inicio: INICIO.toISOString(), servicio_id: "serv-1", estado: "cancelado",
          created_at: new Date().toISOString() },
        { inicio: INICIO.toISOString(), servicio_id: "serv-1", estado: "pendiente",
          created_at: new Date(Date.now() - 20 * 60_000).toISOString() },
      ],
      servicios: [{ id: "serv-1", duracion_min: 30 }],
    });

    await expect(estaOcupado(admin, "neg-1", "staff-1", INICIO, 30)).resolves.toBe(false);
  });

  it("debería estar ocupado por un evento de Google",
  async () =>
  {
    vi.spyOn(calendarService, "getBusyIntervalsForNegocio").mockResolvedValue([
      { start: INICIO, end: new Date(INICIO.getTime() + 30 * 60_000) },
    ]);

    await expect(estaOcupado(stubAdmin(), "neg-1", "staff-1", INICIO, 30)).resolves.toBe(true);
  });
});
