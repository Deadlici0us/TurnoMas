import { describe, expect, it } from "vitest";

import { esEmailValido } from "./email";

describe("esEmailValido",
() =>
{
  it("debería aceptar emails habituales",
  () =>
  {
    expect(esEmailValido("flores.anibal.e@gmail.com")).toBe(true);
    expect(esEmailValido("juan.perez+turno@example.com")).toBe(true);
    expect(esEmailValido("a_b-c%d@sub.ejemplo.com.ar")).toBe(true);
    expect(esEmailValido("USUARIO@EJEMPLO.COM")).toBe(true);
  });

  it("debería rechazar el email con llave que rompió la reserva",
  () =>
  {
    expect(esEmailValido("flores.anibal.e@gmail.com}")).toBe(false);
    expect(esEmailValido("{flores.anibal.e@gmail.com")).toBe(false);
  });

  it("debería rechazar espacios y saltos de línea",
  () =>
  {
    expect(esEmailValido(" juan@ejemplo.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo.com ")).toBe(false);
    expect(esEmailValido("juan perez@ejemplo.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo.com\n")).toBe(false);
    expect(esEmailValido("juan\t@ejemplo.com")).toBe(false);
  });

  it("debería rechazar estructuras inválidas",
  () =>
  {
    expect(esEmailValido("")).toBe(false);
    expect(esEmailValido("no-es-email")).toBe(false);
    expect(esEmailValido("juan@@ejemplo.com")).toBe(false);
    expect(esEmailValido("@ejemplo.com")).toBe(false);
    expect(esEmailValido("juan@")).toBe(false);
    expect(esEmailValido("juan@ejemplo")).toBe(false);
    expect(esEmailValido("juan@ejemplo.c")).toBe(false);
    expect(esEmailValido("juan@ejemplo.com.")).toBe(false);
    expect(esEmailValido("juan@.ejemplo.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo..com")).toBe(false);
  });

  it("debería rechazar puntos mal ubicados en la parte local",
  () =>
  {
    expect(esEmailValido(".juan@ejemplo.com")).toBe(false);
    expect(esEmailValido("juan.@ejemplo.com")).toBe(false);
    expect(esEmailValido("juan..perez@ejemplo.com")).toBe(false);
  });

  it("debería rechazar etiquetas de dominio inválidas",
  () =>
  {
    expect(esEmailValido("juan@-ejemplo.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo-.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo_com.com")).toBe(false);
    expect(esEmailValido("juan@ejemplo.123")).toBe(false);
    expect(esEmailValido("juan@ejemplo.c0m")).toBe(false);
  });

  it("debería rechazar largos fuera de rango",
  () =>
  {
    const localLargo = `${"a".repeat(65)}@ejemplo.com`;
    const dominioLargo = `juan@${"a".repeat(64)}.com`;
    const totalLargo = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;

    expect(esEmailValido(localLargo)).toBe(false);
    expect(esEmailValido(dominioLargo)).toBe(false);
    expect(esEmailValido(totalLargo)).toBe(false);
  });
});
