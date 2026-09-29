import { describe, expect, it } from "vitest";

import { validarTransicionTurno } from "./estados";

describe("validarTransicionTurno",
() =>
{
  it("debería permitir pendiente a pagado y a cancelado",
  () =>
  {
    expect(validarTransicionTurno("pendiente", "pagado")).toBe(true);
    expect(validarTransicionTurno("pendiente", "cancelado")).toBe(true);
  });

  it("debería permitir pagado a completado, ausente y cancelado",
  () =>
  {
    expect(validarTransicionTurno("pagado", "completado")).toBe(true);
    expect(validarTransicionTurno("pagado", "ausente")).toBe(true);
    expect(validarTransicionTurno("pagado", "cancelado")).toBe(true);
  });

  it("debería bloquear estados finales en español",
  () =>
  {
    expect(() => validarTransicionTurno("completado", "pagado"))
      .toThrow("Ese turno ya está cerrado y no se puede modificar.");
    expect(() => validarTransicionTurno("ausente", "cancelado"))
      .toThrow("Ese turno ya está cerrado y no se puede modificar.");
    expect(() => validarTransicionTurno("cancelado", "pagado"))
      .toThrow("Ese turno ya está cerrado y no se puede modificar.");
  });

  it("debería rechazar transiciones inválidas en español",
  () =>
  {
    expect(() => validarTransicionTurno("pendiente", "ausente"))
      .toThrow("No se puede marcar ausente un turno sin cobrar.");
  });
});
