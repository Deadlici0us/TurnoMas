import { describe, expect, it } from "vitest";

import { armarCandidatosRemarketing, filtrarCandidatosVigentes } from "./candidatos";

const AHORA = new Date("2026-10-01T12:00:00Z");

const NEGOCIO = {
  nombre: "Barbería",
  pais: "ar",
  slug: "barberia",
  remarketing_activo: true,
  remarketing_dias: 30,
};

const SERVICIOS = [
  { id: "s-corte", nombre: "Corte", remarketing: true, remarketing_dias: null },
  { id: "s-color", nombre: "Color", remarketing: true, remarketing_dias: 45 },
  { id: "s-barba", nombre: "Barba", remarketing: false, remarketing_dias: null },
];

/** ISO de hace `dias` días respecto de AHORA. */
function hace(dias: number): string
{
  return new Date(AHORA.getTime() - dias * 86_400_000).toISOString();
}

function turno(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    cliente_id: "c-1",
    servicio_id: "s-corte",
    inicio: hace(40),
    fin: hace(40),
    estado: "completado",
    remarketing_manual_at: null,
    ...overrides,
  };
}

const CLIENTE = { id: "c-1", nombre: "Juan", whatsapp: "+5491112345678", bloqueado: false };

describe("armarCandidatosRemarketing",
() =>
{
  it("debería incluir al cliente cuando pasaron los días del servicio",
  () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno()],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]).toMatchObject({ turnoId: "t-1", clienteNombre: "Juan", atrasoDias: 10 });
  });

  it("debería excluir cuando aún no pasaron los días",
  () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno({ inicio: hace(20), fin: hace(20) })],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería respetar los días propios del servicio (Color 45)",
  () =>
  {
    const candidato40 = turno({ servicio_id: "s-color", inicio: hace(40), fin: hace(40) });

    expect(armarCandidatosRemarketing({
      turnos: [candidato40],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    })).toHaveLength(0);

    expect(armarCandidatosRemarketing({
      turnos: [turno({ servicio_id: "s-color", inicio: hace(50), fin: hace(50) })],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    })).toHaveLength(1);
  });

  it("debería tomar solo la última visita del cliente",
  () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [
        turno({ id: "viejo", inicio: hace(60), fin: hace(60) }),
        turno({ id: "nuevo", inicio: hace(40), fin: hace(40) }),
      ],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].turnoId).toBe("nuevo");
  });

  it("debería excluir si el cliente reservó de nuevo (visita reciente)",
  () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [
        turno({ id: "viejo", inicio: hace(60), fin: hace(60) }),
        turno({ id: "nuevo", inicio: hace(5), fin: hace(5) }),
      ],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería excluir si tiene un turno futuro agendado",
  () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [
        turno(),
        turno({ id: "futuro", estado: "confirmado", inicio: hace(-3) }),
      ],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería excluir servicios con remarketing desactivado", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno({ servicio_id: "s-barba" })],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería excluir contacto manual ya marcado", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno({ remarketing_manual_at: hace(2) })],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería excluir clientes bloqueados", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno()],
      clientes: [{ ...CLIENTE, bloqueado: true }],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería devolver vacío si el negocio desactivó el remarketing", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno()],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: { ...NEGOCIO, remarketing_activo: false },
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(0);
  });

  it("debería ordenar primero los más atrasados", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [
        turno({ id: "a", cliente_id: "c-1", inicio: hace(35), fin: hace(35) }),
        turno({ id: "b", cliente_id: "c-2", inicio: hace(70), fin: hace(70) }),
      ],
      clientes: [CLIENTE, { id: "c-2", nombre: "Ana", whatsapp: "+5491187654321", bloqueado: false }],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos.map((c) => c.turnoId)).toEqual(["b", "a"]);
  });

  it("debería usar `inicio` cuando `fin` es null", () =>
  {
    const candidatos = armarCandidatosRemarketing({
      turnos: [turno({ fin: null, inicio: hace(40) })],
      clientes: [CLIENTE],
      servicios: SERVICIOS,
      negocio: NEGOCIO,
      ahora: AHORA,
    });

    expect(candidatos).toHaveLength(1);
  });
});

describe("filtrarCandidatosVigentes",
() =>
{
  function vecino(overrides: Record<string, unknown> = {})
  {
    return {
      id: "t-1",
      cliente_id: "c-1",
      inicio: hace(40),
      fin: hace(40),
      estado: "completado",
      ...overrides,
    };
  }

  it("debería conservar al candidato que es la última visita y sin futuro",
  () =>
  {
    const ids = filtrarCandidatosVigentes(
      [{ id: "t-1", cliente_id: "c-1" }],
      [vecino({ id: "t-1" })],
      AHORA,
    );

    expect(ids).toEqual(["t-1"]);
  });

  it("debería descartar si hay una visita completada más nueva",
  () =>
  {
    const ids = filtrarCandidatosVigentes(
      [{ id: "t-1", cliente_id: "c-1" }],
      [vecino({ id: "t-1", inicio: hace(60), fin: hace(60) }), vecino({ id: "t-2" })],
      AHORA,
    );

    expect(ids).toEqual([]);
  });

  it("debería descartar si el cliente tiene un turno futuro",
  () =>
  {
    const ids = filtrarCandidatosVigentes(
      [{ id: "t-1", cliente_id: "c-1" }],
      [vecino({ id: "t-1" }), vecino({ id: "t-2", estado: "confirmado", inicio: hace(-2), fin: null })],
      AHORA,
    );

    expect(ids).toEqual([]);
  });

  it("debería comparar candidatos de clientes distintos por separado",
  () =>
  {
    const ids = filtrarCandidatosVigentes(
      [{ id: "t-1", cliente_id: "c-1" }, { id: "t-3", cliente_id: "c-2" }],
      [
        vecino({ id: "t-1" }),
        vecino({ id: "t-2", cliente_id: "c-1", inicio: hace(5), fin: hace(5) }),
        vecino({ id: "t-3", cliente_id: "c-2" }),
      ],
      AHORA,
    );

    expect(ids).toEqual(["t-3"]);
  });

  it("no debería descartar por un turno más nuevo que no fue completado",
  () =>
  {
    const ids = filtrarCandidatosVigentes(
      [{ id: "t-1", cliente_id: "c-1" }],
      [
        vecino({ id: "t-1" }),
        vecino({ id: "t-2", cliente_id: "c-1", inicio: hace(5), fin: hace(5), estado: "ausente" }),
      ],
      AHORA,
    );

    expect(ids).toEqual(["t-1"]);
  });
});