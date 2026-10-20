import { describe, expect, it } from "vitest";

import { asignarCarriles } from "./solapamientos";

function resumen(
  bloques: ReadonlyArray<{ readonly key: string; readonly carril: number; readonly carriles: number }>,
): Array<{ key: string; carril: number; carriles: number }>
{
  return bloques.map((b) => ({ key: b.key, carril: b.carril, carriles: b.carriles }));
}

describe("solapamientos",
() =>
{
  it("debería dejar en un solo carril los turnos contiguos",
  () =>
  {
    const resultado = asignarCarriles([
      { key: "a", inicio: 0, fin: 30 },
      { key: "b", inicio: 30, fin: 60 },
    ]);

    expect(resumen(resultado)).toEqual([
      { key: "a", carril: 0, carriles: 1 },
      { key: "b", carril: 0, carriles: 1 },
    ]);
  });

  it("debería separar dos turnos con el mismo horario",
  () =>
  {
    const resultado = asignarCarriles([
      { key: "gisela", inicio: 60, fin: 90 },
      { key: "diego", inicio: 60, fin: 90 },
    ]);

    expect(resumen(resultado)).toEqual([
      { key: "diego", carril: 0, carriles: 2 },
      { key: "gisela", carril: 1, carriles: 2 },
    ]);
  });

  it("debería separar un turno contenido dentro de otro",
  () =>
  {
    const resultado = asignarCarriles([
      { key: "largo", inicio: 0, fin: 120 },
      { key: "corto", inicio: 30, fin: 60 },
    ]);

    expect(resumen(resultado)).toEqual([
      { key: "largo", carril: 0, carriles: 2 },
      { key: "corto", carril: 1, carriles: 2 },
    ]);
  });

  it("debería reutilizar un carril cuando el turno anterior ya terminó",
  () =>
  {
    const resultado = asignarCarriles([
      { key: "a", inicio: 0, fin: 60 },
      { key: "b", inicio: 30, fin: 90 },
      { key: "c", inicio: 60, fin: 120 },
    ]);

    expect(resumen(resultado)).toEqual([
      { key: "a", carril: 0, carriles: 2 },
      { key: "b", carril: 1, carriles: 2 },
      { key: "c", carril: 0, carriles: 2 },
    ]);
  });

  it("debería ignorar intervalos inválidos",
  () =>
  {
    const resultado = asignarCarriles([
      { key: "valido", inicio: 0, fin: 30 },
      { key: "invalido", inicio: 30, fin: 30 },
    ]);

    expect(resumen(resultado)).toEqual([{ key: "valido", carril: 0, carriles: 1 }]);
  });

  it("debería devolver una lista vacía sin bloques", () =>
  {
    expect(asignarCarriles([])).toEqual([]);
  });
});
