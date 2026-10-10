import { describe, expect, it } from "vitest";

import { esEmailValido } from "./email";

describe("esEmailValido",
() =>
{
  it("debería aceptar un email válido simple",
  () =>
  {
    expect(esEmailValido("cliente@mail.com")).toBe(true);
  });

  it("debería aceptar subdominios y etiquetas con guion",
  () =>
  {
    expect(esEmailValido("nombre-apellido@sub.mail.com")).toBe(true);
  });

  it("debería rechazar espacios y saltos de línea",
  () =>
  {
    expect(esEmailValido("cli ente@mail.com")).toBe(false);
    expect(esEmailValido("cliente@mail.com ")).toBe(false);
    expect(esEmailValido("cliente@mail\n.com")).toBe(false);
    expect(esEmailValido("cliente@mail\t.com")).toBe(false);
  });

  it("debería exigir exactamente un @ con local y dominio no vacíos",
  () =>
  {
    expect(esEmailValido("sin-arroba.com")).toBe(false);
    expect(esEmailValido("dos@arro@bas.com")).toBe(false);
    expect(esEmailValido("@mail.com")).toBe(false);
    expect(esEmailValido("cliente@")).toBe(false);
    expect(esEmailValido("")).toBe(false);
  });

  it("debería exigir punto interno en el dominio",
  () =>
  {
    expect(esEmailValido("cliente@mail")).toBe(false);
    expect(esEmailValido("cliente@.com")).toBe(false);
    expect(esEmailValido("cliente@mail.")).toBe(false);
  });
});
