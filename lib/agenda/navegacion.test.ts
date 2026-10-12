import { describe, expect, it } from "vitest";

import
{
  claveDeBase,
  diasDeMes,
  diasDeSemana,
  diaDesdeClave,
  diaEnCurso,
  moverBase,
  normalizarVista,
  resolverVistaAgenda,
} from "./navegacion";

const ZONA = "America/Argentina/Buenos_Aires";

describe("navegacion agenda",
() =>
{
  it("debería normalizar la vista con dia por defecto",
  () =>
  {
    expect(normalizarVista("semana")).toBe("semana");
    expect(normalizarVista("mes")).toBe("mes");
    expect(normalizarVista("dia")).toBe("dia");
    expect(normalizarVista("raro")).toBe("dia");
    expect(normalizarVista(undefined)).toBe("dia");
  });

  it("debería interpretar claves YYYY-MM-DD válidas",
  () =>
  {
    expect(diaDesdeClave("2026-05-12")).toEqual({ anio: 2026, mes: 5, dia: 12 });
    expect(diaDesdeClave(" 2026-05-12 ")).toEqual({ anio: 2026, mes: 5, dia: 12 });
    expect(diaDesdeClave("2026-13-01")).toBeNull();
    expect(diaDesdeClave("2026-02-30")).toBeNull();
    expect(diaDesdeClave("12/05/2026")).toBeNull();
    expect(diaDesdeClave(undefined)).toBeNull();
  });

  it("debería resolver el día en curso en la zona del negocio",
  () =>
  {
    const ahora = new Date("2026-05-12T02:00:00Z");

    expect(diaEnCurso(ahora, ZONA)).toEqual({ anio: 2026, mes: 5, dia: 11 });
    expect(diaEnCurso(new Date("no-fecha"), ZONA)).toBeDefined();
  });

  it("debería resolver vista y base desde la query con fallback a hoy",
  () =>
  {
    const ahora = new Date("2026-05-12T12:00:00-03:00");

    expect(resolverVistaAgenda({ vista: "semana", fecha: "2026-05-20" }, ahora, ZONA)).toEqual({
      vista: "semana",
      base: { anio: 2026, mes: 5, dia: 20 },
    });
    expect(resolverVistaAgenda({ vista: "raro", fecha: "mala" }, ahora, ZONA)).toEqual({
      vista: "dia",
      base: { anio: 2026, mes: 5, dia: 12 },
    });
  });

  it("debería mover la base por día, semana y mes",
  () =>
  {
    const base = { anio: 2026, mes: 5, dia: 12 };

    expect(moverBase(base, "dia", 1)).toEqual({ anio: 2026, mes: 5, dia: 13 });
    expect(moverBase(base, "dia", -1)).toEqual({ anio: 2026, mes: 5, dia: 11 });
    expect(moverBase(base, "semana", 1)).toEqual({ anio: 2026, mes: 5, dia: 19 });
    expect(moverBase(base, "semana", -1)).toEqual({ anio: 2026, mes: 5, dia: 5 });
    expect(moverBase(base, "mes", 1)).toEqual({ anio: 2026, mes: 6, dia: 12 });
    expect(moverBase(base, "mes", -1)).toEqual({ anio: 2026, mes: 4, dia: 12 });
    expect(moverBase({ anio: 2026, mes: 1, dia: 31 }, "mes", 1)).toEqual({ anio: 2026, mes: 2, dia: 28 });
    expect(moverBase({ anio: 2026, mes: 12, dia: 15 }, "mes", 1)).toEqual({ anio: 2027, mes: 1, dia: 15 });
  });

  it("debería devolver la semana lun-dom que contiene a la base",
  () =>
  {
    const dias = diasDeSemana({ anio: 2026, mes: 5, dia: 13 }, ZONA);

    expect(dias).toHaveLength(7);
    expect(dias[0]).toEqual({ anio: 2026, mes: 5, dia: 11 });
    expect(dias[6]).toEqual({ anio: 2026, mes: 5, dia: 17 });
  });

  it("debería cubrir el mes en semanas completas",
  () =>
  {
    const dias = diasDeMes({ anio: 2026, mes: 5, dia: 12 });

    expect(dias.length % 7).toBe(0);
    expect(dias[0]).toEqual({ anio: 2026, mes: 4, dia: 27 });
    expect(dias[dias.length - 1]).toEqual({ anio: 2026, mes: 5, dia: 31 });
    expect(claveDeBase({ anio: 2026, mes: 5, dia: 12 })).toBe("2026-05-12");
  });
});
