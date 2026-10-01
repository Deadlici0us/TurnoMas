import { describe, expect, it } from "vitest";

import { resolverResenaHs, resolveReviewDestination, shouldAskReview } from "./resenas";

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

describe("resolveReviewDestination",
() =>
{
  it("debería derivar a Google Maps con 4 o 5 estrellas",
  () =>
  {
    expect(resolveReviewDestination(5)).toBe("google-maps");
    expect(resolveReviewDestination(4)).toBe("google-maps");
  });

  it("debería pedir feedback interno con 1 a 3 estrellas",
  () =>
  {
    expect(resolveReviewDestination(3)).toBe("feedback-interno");
    expect(resolveReviewDestination(1)).toBe("feedback-interno");
  });

  it("debería rechazar estrellas fuera de 1 a 5",
  () =>
  {
    expect(() => resolveReviewDestination(0)).toThrow(RangeError);
    expect(() => resolveReviewDestination(6)).toThrow(RangeError);
  });
});
