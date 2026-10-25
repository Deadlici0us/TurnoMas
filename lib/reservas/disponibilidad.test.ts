import { describe, expect, it } from "vitest";

import { estaOcupado } from "@/lib/reservas/disponibilidad";

interface Filas
{
  readonly turnos?: unknown[];
  readonly servicios?: unknown[];
}

interface StubOpciones
{
  readonly filtrarPorInicio?: boolean;
}

/**
 * Stub admin con queries thenables para turnos y servicios.
 *
 * @param filas Filas devueltas por tabla.
 * @param opciones Simula el filtro `gte` de Supabase sobre `turnos.inicio`.
 * @return Cliente admin mínimo.
 */
function stubAdmin(filas: Filas = {}, opciones: StubOpciones = {})
{
  let inicioMinimo: string | null = null;

  const build = (tabla: string): Record<string, unknown> =>
  {
    const query: Record<string, unknown> = {};

    for (const metodo of ["select", "eq", "order", "limit"])
    {
      query[metodo] = () => query;
    }

    query.gte = (_columna: string, valor: string) =>
    {
      inicioMinimo = valor;

      return query;
    };

    query.then = (resolve: (value: unknown) => unknown) =>
    {
      const filasTabla = (tabla === "turnos" ? filas.turnos : filas.servicios) ?? [];
      const datos = tabla === "turnos" && opciones.filtrarPorInicio === true && inicioMinimo !== null
        ? filasTabla.filter((fila) =>
          new Date((fila as { inicio: string }).inicio).getTime() >= new Date(inicioMinimo as string).getTime())
        : filasTabla;

      return resolve({ data: datos, error: null });
    };

    return query;
  };

  return { from: (tabla: string) => build(tabla) } as never;
}

const INICIO = new Date("2026-10-06T13:00:00.000Z");

describe("estaOcupado",
() =>
{
  it("debería estar libre sin turnos ni eventos",
  async () =>
  {
    await expect(estaOcupado(stubAdmin(), "neg-1", "staff-1", INICIO, 30)).resolves.toBe(false);
  });

  it("debería estar ocupado si solapa un turno confirmado",
  async () =>
  {
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

  it("debería usar el fin real del turno aunque el servicio dure menos",
  async () =>
  {
    const admin = stubAdmin({
      turnos: [{
        inicio: INICIO.toISOString(),
        fin: new Date(INICIO.getTime() + 45 * 60_000).toISOString(),
        servicio_id: "serv-1",
        estado: "confirmado",
        created_at: new Date().toISOString(),
      }],
      servicios: [{ id: "serv-1", duracion_min: 30 }],
    });
    const candidato = new Date(INICIO.getTime() + 30 * 60_000);

    await expect(estaOcupado(admin, "neg-1", "staff-1", candidato, 30)).resolves.toBe(true);
  });

  it("debería considerar un turno en curso iniciado antes de ahora",
  async () =>
  {
    const ahora = Date.now();
    const inicioTurno = new Date(ahora - 20 * 60_000);
    const finTurno = new Date(ahora + 25 * 60_000);
    const candidato = new Date(ahora + 10 * 60_000);
    const admin = stubAdmin({
      turnos: [{
        inicio: inicioTurno.toISOString(),
        fin: finTurno.toISOString(),
        servicio_id: "serv-1",
        estado: "confirmado",
        created_at: new Date(ahora - 60 * 60_000).toISOString(),
      }],
      servicios: [{ id: "serv-1", duracion_min: 30 }],
    }, { filtrarPorInicio: true });

    await expect(estaOcupado(admin, "neg-1", "staff-1", candidato, 30)).resolves.toBe(true);
  });

  it("debería ignorar turnos cancelados y pendientes vencidos",
  async () =>
  {
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
});
