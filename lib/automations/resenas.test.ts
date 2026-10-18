import { describe, expect, it } from "vitest";

import { esEstrellasValidas, resolverResenaHs, shouldAskReview } from "./resenas";

const AHORA = new Date("2026-09-28T10:00:00Z");

describe("shouldAskReview",
() =>
{
  it("debería pedir reseña 2h después del fin cuando no fue pedida",
  () =>
  {
    const fin = new Date("2026-09-28T07:00:00Z");

    expect(shouldAskReview({ fin, resenaPedida: false }, AHORA)).toBe(true);
  });

  it("debería conservar antes de las 2h posteriores",
  () =>
  {
    const fin = new Date("2026-09-28T09:00:00Z");

    expect(shouldAskReview({ fin, resenaPedida: false }, AHORA)).toBe(false);
  });

  it("debería respetar la demora configurable del negocio",
  () =>
  {
    const fin = new Date("2026-09-28T06:00:00Z");

    expect(shouldAskReview({ fin, resenaPedida: false }, AHORA, 4)).toBe(true);
    expect(shouldAskReview({ fin, resenaPedida: false }, AHORA, 5)).toBe(false);
  });

  it("debería normalizar demoras inválidas a 2hs",
  () =>
  {
    expect(resolverResenaHs(undefined)).toBe(2);
    expect(resolverResenaHs(0)).toBe(2);
    expect(resolverResenaHs(100)).toBe(2);
    expect(resolverResenaHs(6)).toBe(6);
  });
});

describe("esEstrellasValidas",
() =>
{
  it("debería aceptar enteros de 1 a 5",
  () =>
  {
    expect(esEstrellasValidas(1)).toBe(true);
    expect(esEstrellasValidas(5)).toBe(true);
  });

  it("debería rechazar fuera de rango o no enteros",
  () =>
  {
    expect(esEstrellasValidas(0)).toBe(false);
    expect(esEstrellasValidas(6)).toBe(false);
    expect(esEstrellasValidas(3.5)).toBe(false);
    expect(esEstrellasValidas("4")).toBe(false);
    expect(esEstrellasValidas(undefined)).toBe(false);
  });
});
