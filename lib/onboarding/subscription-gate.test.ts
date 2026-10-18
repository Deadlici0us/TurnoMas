import { describe, expect, it } from "vitest";

import { getNegocioSubscriptionStatus, resolverMargenRenovacionHoras } from "./subscription-gate";

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

  it("debería dar el margen de renovación en mora reciente",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "past_due",
          suscripcion_mp_id: "mp-123",
          suscripcion_mora_desde: "2026-09-27T12:00:00Z",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("past_due");
  });

  it("debería bloquear vencida la gracia de mora",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "past_due",
          suscripcion_mp_id: "mp-123",
          suscripcion_mora_desde: "2026-09-01T00:00:00Z",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("blocked");
  });

  it("debería mantener activa la suscripción cancelada hasta el vencimiento",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "active",
          suscripcion_mp_id: "mp-123",
          suscripcion_cancelada_en: "2026-09-20T00:00:00Z",
          suscripcion_vence_en: "2026-10-01T00:00:00Z",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("active");
  });

  it("debería bloquear la suscripción cancelada pasada de fecha",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "active",
          suscripcion_mp_id: "mp-123",
          suscripcion_cancelada_en: "2026-09-20T00:00:00Z",
          suscripcion_vence_en: "2026-09-25T00:00:00Z",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("blocked");
  });

  it("debería no bloquear por vencimiento si MP confirma authorized",
  () =>
  {
    expect(
      getNegocioSubscriptionStatus(
        {
          created_at: "2026-01-01T00:00:00Z",
          suscripcion_estado: "active",
          suscripcion_mp_id: "mp-123",
          suscripcion_vence_en: "2026-09-25T00:00:00Z",
          suscripcion_mp_status: "authorized",
        },
        new Date("2026-09-28T00:00:00Z"),
      ),
    ).toBe("active");
  });
});

describe("resolverMargenRenovacionHoras",
() =>
{
  it("debería usar 24 por defecto y aceptar un override válido",
  () =>
  {
    expect(resolverMargenRenovacionHoras({})).toBe(24);
    expect(resolverMargenRenovacionHoras({ MP_MARGEN_RENOVACION_HORAS: "48" })).toBe(48);
    expect(resolverMargenRenovacionHoras({ MP_MARGEN_RENOVACION_HORAS: "0" })).toBe(24);
    expect(resolverMargenRenovacionHoras({ MP_MARGEN_RENOVACION_HORAS: "abc" })).toBe(24);
  });
});
