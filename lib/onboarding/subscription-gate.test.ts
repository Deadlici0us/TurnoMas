import { describe, expect, it } from "vitest";

import { getNegocioSubscriptionStatus } from "./subscription-gate";

describe("getNegocioSubscriptionStatus",
() =>
{
  it("debería estar en prueba sin fecha de creación (seed en memoria)",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        { created_at: null, suscripcion_estado: null, suscripcion_mp_id: null },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("trial");
  });

  it("debería estar activa con suscripción de MercadoPago",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "active",
          suscripcion_mp_id: "mp-123",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("active");
  });

  it("debería bloquearse pasados 14 días sin suscripción",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-09-01T00:00:00Z",
          suscripcion_estado: "trial",
          suscripcion_mp_id: null,
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("blocked");
  });

  it("debería seguir en prueba dentro de los 14 días",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-09-20T00:00:00Z",
          suscripcion_estado: "trial",
          suscripcion_mp_id: null,
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("trial");
  });
});
