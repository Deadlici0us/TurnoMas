import { describe, expect, it } from "vitest";

import
{
  avisoSuscripcion,
  diasSuscripcionRestantes,
  diasTrialRestantes,
  MARGEN_RENOVACION_HORAS_DEFAULT,
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

  it("debería dar el margen de renovación como gracia en mora",
  () =>
  {
    expect(MARGEN_RENOVACION_HORAS_DEFAULT).toBe(24);
    const result = evaluateSubscription(
      input({
        now: new Date("2026-10-20T12:00:00Z"),
        suscripcionEstado: "past_due",
        suscripcionMpId: "mp-123",
        suscripcionMoraDesde: new Date("2026-10-20T00:00:00Z"),
      }),
    );

    expect(result).toBe("past_due");
  });

  it("debería respetar un margen de renovación configurable",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-10-20T12:00:00Z"),
        suscripcionEstado: "past_due",
        suscripcionMpId: "mp-123",
        suscripcionMoraDesde: new Date("2026-10-20T00:00:00Z"),
        margenHoras: 1,
      }),
    );

    expect(result).toBe("blocked");
  });

  it("debería bloquear vencida la gracia de mora",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-10-20T00:00:00Z"),
        suscripcionEstado: "past_due",
        suscripcionMpId: "mp-123",
        suscripcionMoraDesde: new Date("2026-10-10T00:00:00Z"),
      }),
    );

    expect(result).toBe("blocked");
  });

  it("debería bloquear en mora sin fecha de inicio",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-10-20T00:00:00Z"),
        suscripcionEstado: "past_due",
        suscripcionMpId: "mp-123",
        suscripcionMoraDesde: null,
      }),
    );

    expect(result).toBe("blocked");
  });

  it("debería mantener el acceso de una suscripción cancelada hasta el vencimiento",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-10-20T00:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionCanceladaEn: new Date("2026-10-18T00:00:00Z"),
        suscripcionVenceEn: new Date("2026-11-01T00:00:00Z"),
      }),
    );

    expect(result).toBe("active");
  });

  it("debería bloquear una suscripción cancelada pasada su fecha de vencimiento y el margen",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-11-03T00:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionCanceladaEn: new Date("2026-10-18T00:00:00Z"),
        suscripcionVenceEn: new Date("2026-11-01T00:00:00Z"),
      }),
    );

    expect(result).toBe("blocked");
  });

  it("debería seguir activa sin cancelar dentro del margen del vencimiento",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-11-01T12:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionVenceEn: new Date("2026-11-01T00:00:00Z"),
      }),
    );

    expect(result).toBe("active");
  });

  it("debería no bloquear si MercadoPago confirma la suscripción autorizada",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-11-05T00:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionVenceEn: new Date("2026-11-01T00:00:00Z"),
        suscripcionMpStatus: "authorized",
      }),
    );

    expect(result).toBe("active");
  });

  it("debería bloquear sin confirmación de MP pasados el vencimiento y el margen",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-11-05T00:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionVenceEn: new Date("2026-11-01T00:00:00Z"),
      }),
    );

    expect(result).toBe("blocked");
  });

  it("debería seguir activa si no conoce el vencimiento de la cancelada",
  () =>
  {
    const result = evaluateSubscription(
      input({
        now: new Date("2026-11-02T00:00:00Z"),
        suscripcionEstado: "active",
        suscripcionMpId: "mp-123",
        suscripcionCanceladaEn: new Date("2026-10-18T00:00:00Z"),
        suscripcionVenceEn: null,
      }),
    );

    expect(result).toBe("active");
  });
});

describe("diasTrialRestantes",
() =>
{
  it("debería calcular los días restantes",
  () =>
  {
    expect(diasTrialRestantes("2026-09-01T00:00:00Z", new Date("2026-09-05T00:00:00Z"))).toBe(10);
    expect(diasTrialRestantes(null, new Date())).toBeNull();
    expect(diasTrialRestantes("invalida", new Date())).toBeNull();
    expect(diasTrialRestantes("2026-09-01T00:00:00Z", new Date("2026-10-01T00:00:00Z"))).toBe(0);
  });
});

describe("diasSuscripcionRestantes",
() =>
{
  it("debería calcular los días hasta el vencimiento",
  () =>
  {
    expect(diasSuscripcionRestantes("2026-11-01T00:00:00Z", new Date("2026-10-20T00:00:00Z")))
      .toBe(12);
    expect(diasSuscripcionRestantes("2026-11-01T00:00:00Z", new Date("2026-11-02T00:00:00Z")))
      .toBe(0);
  });

  it("debería devolver null con fecha ausente o inválida",
  () =>
  {
    expect(diasSuscripcionRestantes(null, new Date())).toBeNull();
    expect(diasSuscripcionRestantes("invalida", new Date())).toBeNull();
  });
});

describe("avisoSuscripcion",
() =>
{
  it("debería avisar mora y trial por vencer",
  () =>
  {
    expect(avisoSuscripcion("past_due", null, new Date()))
      .toContain("Falló el último cobro");
    expect(avisoSuscripcion("trial", "2026-09-01T00:00:00Z", new Date("2026-09-13T00:00:00Z")))
      .toContain("Te quedan 2 días");
  });

  it("debería callar con plan activo o trial holgado",
  () =>
  {
    expect(avisoSuscripcion("active", null, new Date())).toBeNull();
    expect(avisoSuscripcion("blocked", null, new Date())).toBeNull();
    expect(avisoSuscripcion("trial", "2026-09-01T00:00:00Z", new Date("2026-09-05T00:00:00Z")))
      .toBeNull();
  });
});
