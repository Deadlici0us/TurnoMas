import { describe, expect, it } from "vitest";

import { construirHistorialCliente, resumirHistorial } from "./historial-cliente";

function turno(overrides: Record<string, unknown> = {})
{
  return {
    id: "t-1",
    cliente_id: "cli-1",
    servicio_id: "serv-1",
    staff_id: "staff-1",
    inicio: "2026-10-05T14:00:00.000Z",
    estado: "completado",
    monto_total: 1500000,
    sena_monto: null,
    ...overrides,
  };
}

describe("construirHistorialCliente",
() =>
{
  it("debería devolver solo los turnos del cliente",
  () =>
  {
    const turnos = [
      turno({ id: "t-1", cliente_id: "cli-1", inicio: "2026-10-04T14:00:00.000Z" }),
      turno({ id: "t-2", cliente_id: "cli-2", inicio: "2026-10-05T14:00:00.000Z" }),
      turno({ id: "t-3", cliente_id: "cli-1", inicio: "2026-10-06T14:00:00.000Z" }),
    ];

    const historial = construirHistorialCliente(turnos, "cli-1");

    expect(historial.map((t) => t.id)).toEqual(["t-3", "t-1"]);
  });

  it("debería ordenar por inicio descendente",
  () =>
  {
    const turnos = [
      turno({ id: "viejo", inicio: "2026-01-01T10:00:00.000Z" }),
      turno({ id: "nuevo", inicio: "2026-12-01T10:00:00.000Z" }),
      turno({ id: "medio", inicio: "2026-06-01T10:00:00.000Z" }),
    ];

    const historial = construirHistorialCliente(turnos, "cli-1");

    expect(historial.map((t) => t.id)).toEqual(["nuevo", "medio", "viejo"]);
  });

  it("debería devolver lista vacía si el cliente no tiene turnos",
  () =>
  {
    expect(construirHistorialCliente([turno({ cliente_id: "otro" })], "cli-1")).toEqual([]);
    expect(construirHistorialCliente([], "cli-1")).toEqual([]);
  });
});

describe("resumirHistorial",
() =>
{
  it("debería contar estados y sumar completados y señas cobradas",
  () =>
  {
    const historial = [
      turno({ estado: "completado", monto_total: 1000000, sena_monto: 500000 }),
      turno({ estado: "completado", monto_total: 2000000, sena_monto: null }),
      turno({ estado: "pagado", monto_total: 3000000, sena_monto: 1500000 }),
      turno({ estado: "ausente", monto_total: 1000000, sena_monto: 500000 }),
      turno({ estado: "cancelado", monto_total: 1000000, sena_monto: 500000 }),
      turno({ estado: "pendiente", monto_total: 1000000, sena_monto: 500000 }),
    ];

    const resumen = resumirHistorial(historial);

    expect(resumen.total).toBe(6);
    expect(resumen.completados).toBe(2);
    expect(resumen.ausentes).toBe(1);
    expect(resumen.cancelados).toBe(1);
    expect(resumen.totalFacturado).toBe(3000000);
    expect(resumen.totalSenas).toBe(2500000);
  });

  it("debería devolver ceros con historial vacío",
  () =>
  {
    expect(resumirHistorial([])).toEqual({
      total: 0,
      completados: 0,
      ausentes: 0,
      cancelados: 0,
      totalFacturado: 0,
      totalSenas: 0,
    });
  });

  it("debería tolerar montos nulos",
  () =>
  {
    const resumen = resumirHistorial([
      turno({ estado: "completado", monto_total: null, sena_monto: null }),
      turno({ estado: "pagado", monto_total: null, sena_monto: null }),
    ]);

    expect(resumen.totalFacturado).toBe(0);
    expect(resumen.totalSenas).toBe(0);
  });
});
