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
  it("debería sumar duración del servicio más buffer de limpieza",
  () =>
  {
    const result = getBlockedInterval(at(0), 30, 15);

    expect(result.start).toEqual(at(0));
    expect(result.end).toEqual(at(45));
  });

  it("debería permitir buffer de limpieza en cero",
  () =>
  {
    const result = getBlockedInterval(at(0), 30, 0);

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
    const existing = [blocked(0, 45)];

    expect(isSlotAvailable(at(30), 30, 0, existing)).toBe(false);
  });

  it("debería aceptar un turno contiguo al bloqueo existente",
  () =>
  {
    const existing = [blocked(0, 45)];

    expect(isSlotAvailable(at(45), 30, 0, existing)).toBe(true);
  });

  it("debería considerar el buffer al evaluar disponibilidad",
  () =>
  {
    const existing = [blocked(60, 105)];

    // Turno de 30 min + 15 min de limpieza = bloquea 10:00-10:45, no solapa con 11:00.
    expect(isSlotAvailable(at(0), 30, 15, existing)).toBe(true);
    // Mismo turno a las 10:30 bloquearía 10:30-11:15 y sí solapa con 11:00.
    expect(isSlotAvailable(at(30), 30, 15, existing)).toBe(false);
  });

  it("debería aceptar cuando no hay turnos existentes",
  () =>
  {
    expect(isSlotAvailable(at(0), 30, 15, [])).toBe(true);
  });
});
