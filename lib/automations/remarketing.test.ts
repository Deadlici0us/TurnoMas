import { describe, expect, it } from "vitest";

import {
  clasificarRemarketing,
  fechaObjetivoRemarketing,
  resolverRemarketingDias,
} from "./remarketing";

const AHORA = new Date("2026-09-28T10:00:00Z");

describe("resolverRemarketingDias",
() =>
{
  it("debería preferir los días del servicio y heredar los del negocio",
  () =>
  {
    expect(resolverRemarketingDias(45, 30)).toBe(45);
    expect(resolverRemarketingDias(null, 30)).toBe(30);
    expect(resolverRemarketingDias(undefined, undefined)).toBe(30);
    expect(resolverRemarketingDias(0, 200)).toBe(30);
  });
});

describe("fechaObjetivoRemarketing",
() =>
{
  it("debería calcular la fecha objetivo exacta",
  () =>
  {
    const fin = new Date("2026-09-20T10:00:00Z");

    expect(fechaObjetivoRemarketing(fin, 7).toISOString()).toBe("2026-09-27T10:00:00.000Z");
  });

  it("debería rechazar dias no positivos",
  () =>
  {
    const fin = new Date("2026-09-20T10:00:00Z");

    expect(() => fechaObjetivoRemarketing(fin, 0)).toThrow(RangeError);
    expect(() => fechaObjetivoRemarketing(fin, -1)).toThrow(RangeError);
  });
});

describe("clasificarRemarketing",
() =>
{
  it("devuelve null cuando aún no toca contactar",
  () =>
  {
    const fin = new Date("2026-09-25T10:00:00Z");

    expect(clasificarRemarketing(fin, 7, AHORA)).toBeNull();
  });

  it("devuelve atraso 0 cuando toca hoy",
  () =>
  {
    const fin = new Date("2026-09-21T10:00:00Z");

    expect(clasificarRemarketing(fin, 7, new Date("2026-09-28T10:00:00Z")))
      .toEqual({ atrasoDias: 0 });
  });

  it("devuelve atraso 2 cuando pasaron dos días del objetivo",
  () =>
  {
    const fin = new Date("2026-09-20T10:00:00Z");

    expect(clasificarRemarketing(fin, 7, new Date("2026-09-29T10:00:00Z")))
      .toEqual({ atrasoDias: 2 });
  });

  it("debería rechazar una ventana no positiva",
  () =>
  {
    const fin = new Date("2026-09-10T10:00:00Z");

    expect(() => clasificarRemarketing(fin, 0, new Date())).toThrow(RangeError);
  });
});