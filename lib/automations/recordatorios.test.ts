import { describe, expect, it } from "vitest";

import { resolverRecordatorioHs, shouldSendReminder } from "./recordatorios";

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

  it("debería respetar la ventana configurable del negocio",
  () =>
  {
    const inicio48 = new Date("2026-09-30T09:00:00Z");

    expect(shouldSendReminder({ inicio: inicio48, notificacionEnviada: false }, AHORA, 48)).toBe(true);
    expect(shouldSendReminder({ inicio: inicio48, notificacionEnviada: false }, AHORA, 24)).toBe(false);
  });

  it("debería normalizar ventanas inválidas a 24hs",
  () =>
  {
    expect(resolverRecordatorioHs(undefined)).toBe(24);
    expect(resolverRecordatorioHs(0)).toBe(24);
    expect(resolverRecordatorioHs(100)).toBe(24);
    expect(resolverRecordatorioHs(12)).toBe(12);
  });
});
