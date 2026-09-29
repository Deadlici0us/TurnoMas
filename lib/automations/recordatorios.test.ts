import { describe, expect, it } from "vitest";

import { shouldSendReminder } from "./recordatorios";

const AHORA = new Date("2026-09-28T10:00:00Z");

describe("shouldSendReminder",
() =>
{
  it("debería enviar cuando falta menos de 24h y no fue enviado",
  () =>
  {
    const inicio = new Date("2026-09-29T09:00:00Z");

    expect(shouldSendReminder({ inicio, notificacionEnviada: false }, AHORA)).toBe(true);
  });

  it("debería conservar cuando falta más de 24h",
  () =>
  {
    const inicio = new Date("2026-09-30T10:00:00Z");

    expect(shouldSendReminder({ inicio, notificacionEnviada: false }, AHORA)).toBe(false);
  });

  it("debería conservar cuando ya fue enviado",
  () =>
  {
    const inicio = new Date("2026-09-29T09:00:00Z");

    expect(shouldSendReminder({ inicio, notificacionEnviada: true }, AHORA)).toBe(false);
  });

  it("debería conservar cuando el turno ya empezó",
  () =>
  {
    const inicio = new Date("2026-09-28T09:00:00Z");

    expect(shouldSendReminder({ inicio, notificacionEnviada: false }, AHORA)).toBe(false);
  });
});
