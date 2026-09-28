import { describe, expect, it } from "vitest";

import
{
  TRIAL_DAYS,
  evaluateSubscription,
} from "./trial";
import type { SubscriptionInput } from "./trial";

function input(overrides: Partial<SubscriptionInput> = {}): SubscriptionInput
{
  return {
    createdAt: new Date("2026-09-01T00:00:00Z"),
    now: new Date("2026-09-05T00:00:00Z"),
    suscripcionEstado: null,
    suscripcionMpId: null,
    ...overrides,
  };
}

describe("evaluateSubscription",
() =>
{
  it("debería estar en prueba dentro de los 14 días sin suscripción",
  () =>
  {
    expect(TRIAL_DAYS).toBe(14);
    expect(evaluateSubscription(input())).toBe("trial");
  });

  it("debería estar activa con suscripción de MercadoPago",
  () =>
  {
    const result = evaluateSubscription(
      input({ suscripcionEstado: "active", suscripcionMpId: "mp-123" }),
    );

    expect(result).toBe("active");
  });

  it("debería bloquearse pasados los 14 días sin suscripción activa",
  () =>
  {
    const result = evaluateSubscription(
      input({ now: new Date("2026-09-20T00:00:00Z") }),
    );

    expect(result).toBe("blocked");
  });

  it("debería seguir en prueba exactamente el día 14",
  () =>
  {
    const result = evaluateSubscription(
      input({ now: new Date("2026-09-15T00:00:00Z") }),
    );

    expect(result).toBe("trial");
  });

  it("debería bloquearse el día 15 sin pago",
  () =>
  {
    const result = evaluateSubscription(
      input({ now: new Date("2026-09-16T00:00:01Z") }),
    );

    expect(result).toBe("blocked");
  });

  it("debería tratar la creación futura como prueba",
  () =>
  {
    const result = evaluateSubscription(
      input({
        createdAt: new Date("2026-10-01T00:00:00Z"),
        now: new Date("2026-09-01T00:00:00Z"),
      }),
    );

    expect(result).toBe("trial");
  });

  it("debería exigir el id de MercadoPago para considerar activa la suscripción",
  () =>
  {
    const result = evaluateSubscription(
      input({ suscripcionEstado: "active", suscripcionMpId: null }),
    );

    expect(result).toBe("trial");
  });
});
