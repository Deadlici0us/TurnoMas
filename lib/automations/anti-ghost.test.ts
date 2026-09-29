import { describe, expect, it } from "vitest";

import { shouldReleaseBooking } from "./anti-ghost";
import type { UnpaidBooking } from "./anti-ghost";

const NOW = new Date("2026-09-28T13:00:00Z");

function booking(createdAtIso: string, paymentRegistered: boolean): UnpaidBooking
{
  return { createdAt: new Date(createdAtIso), paymentRegistered };
}

describe("shouldReleaseBooking",
() =>
{
  it("debería liberar una reserva impaga vencida (gracia 15 min)",
  () =>
  {
    expect(shouldReleaseBooking(booking("2026-09-28T12:40:00Z", false), NOW, 15)).toBe(true);
  });

  it("debería conservar una reserva impaga dentro de la gracia",
  () =>
  {
    expect(shouldReleaseBooking(booking("2026-09-28T12:50:00Z", false), NOW, 15)).toBe(false);
  });

  it("debería liberar justo al cumplirse la gracia",
  () =>
  {
    expect(shouldReleaseBooking(booking("2026-09-28T12:45:00Z", false), NOW, 15)).toBe(true);
  });

  it("debería conservar una reserva paga aunque pase la gracia",
  () =>
  {
    expect(shouldReleaseBooking(booking("2026-09-28T12:00:00Z", true), NOW, 15)).toBe(false);
  });

  it("debería conservar una reserva creada en el futuro",
  () =>
  {
    expect(shouldReleaseBooking(booking("2026-09-28T13:30:00Z", false), NOW, 15)).toBe(false);
  });

  it("debería rechazar una gracia no positiva",
  () =>
  {
    expect(() => shouldReleaseBooking(booking("2026-09-28T12:00:00Z", false), NOW, 0))
      .toThrow(RangeError);
    expect(() => shouldReleaseBooking(booking("2026-09-28T12:00:00Z", false), NOW, -5))
      .toThrow(RangeError);
  });
});
