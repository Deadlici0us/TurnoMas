import { describe, expect, it } from "vitest";

import { calcularResumenTurnosPorStaff } from "./resumen-turnos";

const AHORA = new Date("2026-10-22T12:00:00.000Z");

function turno(staffId: string, fin: string, estado: string)
{
  return { staff_id: staffId, inicio: fin, fin, estado };
}

describe("calcularResumenTurnosPorStaff",
() =>
{
  it("debería devolver un mapa vacío sin turnos",
  () =>
  {
    expect(calcularResumenTurnosPorStaff([], AHORA).size).toBe(0);
  });

  it("debería contar históricos sin marcarlos como próximos",
  () =>
  {
    const resumen = calcularResumenTurnosPorStaff([
      turno("s-1", "2026-10-20T12:00:00.000Z", "cancelado"),
      turno("s-1", "2026-10-21T12:00:00.000Z", "confirmado"),
    ], AHORA);

    expect(resumen.get("s-1")).toEqual({ total: 2, proximos: 0 });
  });

  it("debería contar próximos según fin y estado",
  () =>
  {
    const resumen = calcularResumenTurnosPorStaff([
      turno("s-1", "2026-10-22T13:00:00.000Z", "confirmado"),
      turno("s-1", "2026-10-23T12:00:00.000Z", "pagado"),
      turno("s-1", "2026-10-24T12:00:00.000Z", "cancelado"),
      turno("s-1", "2026-10-25T12:00:00.000Z", "completado"),
    ], AHORA);

    expect(resumen.get("s-1")).toEqual({ total: 4, proximos: 2 });
  });

  it("debería separar por profesional",
  () =>
  {
    const resumen = calcularResumenTurnosPorStaff([
      turno("s-1", "2026-10-20T12:00:00.000Z", "confirmado"),
      turno("s-2", "2026-10-23T12:00:00.000Z", "pendiente"),
    ], AHORA);

    expect(resumen.get("s-1")).toEqual({ total: 1, proximos: 0 });
    expect(resumen.get("s-2")).toEqual({ total: 1, proximos: 1 });
  });

  it("debería ignorar filas sin staff o con fechas inválidas para próximos",
  () =>
  {
    const resumen = calcularResumenTurnosPorStaff([
      { staff_id: null, fin: "2026-10-23T12:00:00.000Z", estado: "confirmado" },
      { staff_id: "s-1", fin: "no-es-fecha", inicio: "tampoco", estado: "confirmado" },
    ], AHORA);

    expect(resumen.size).toBe(1);
    expect(resumen.get("s-1")).toEqual({ total: 1, proximos: 0 });
  });
});
