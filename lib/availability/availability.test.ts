import { describe, expect, it } from "vitest";

import
{
  getBlockedInterval,
  intervalsOverlap,
  isSlotAvailable,
} from "./availability";
import type { BlockedInterval } from "./availability";

function at(minutes: number): Date
{
  return new Date(Date.UTC(2026, 8, 28, 10, minutes, 0));
}

function blocked(startMinutes: number, endMinutes: number): BlockedInterval
{
  return { start: at(startMinutes), end: at(endMinutes) };
}

describe("getBlockedInterval",
() =>
{
  it("debería bloquear la duración del servicio",
  () =>
  {
    const result = getBlockedInterval(at(0), 30);

    expect(result.start).toEqual(at(0));
    expect(result.end).toEqual(at(30));
  });
});

describe("intervalsOverlap",
() =>
{
  it("debería detectar solape parcial",
  () =>
  {
    expect(intervalsOverlap(blocked(0, 45), blocked(30, 60))).toBe(true);
  });

  it("debería permitir slots contiguos sin solape",
  () =>
  {
    expect(intervalsOverlap(blocked(0, 45), blocked(45, 90))).toBe(false);
  });
});

describe("isSlotAvailable",
() =>
{
  it("debería rechazar un turno que solapa con un bloqueo existente",
  () =>
  {
    const existing = [blocked(0, 30)];

    expect(isSlotAvailable(at(15), 30, existing)).toBe(false);
  });

  it("debería aceptar un turno contiguo al bloqueo existente",
  () =>
  {
    const existing = [blocked(0, 30)];

    expect(isSlotAvailable(at(30), 30, existing)).toBe(true);
  });

  it("debería rechazar un turno que solapa por minutos",
  () =>
  {
    const existing = [blocked(60, 90)];

    // Turno de 30 min a las 10:00 bloquea 10:00-10:30, no solapa con 11:00.
    expect(isSlotAvailable(at(0), 30, existing)).toBe(true);
    // Mismo turno a las 10:45 bloquearía 10:45-11:15 y sí solapa con 11:00.
    expect(isSlotAvailable(at(45), 30, existing)).toBe(false);
  });

  it("debería aceptar cuando no hay turnos existentes",
  () =>
  {
    expect(isSlotAvailable(at(0), 30, [])).toBe(true);
  });
});
