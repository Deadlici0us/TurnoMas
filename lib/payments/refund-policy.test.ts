import { describe, expect, it } from "vitest";

import { horasRestantesPara, resolverRetencionHs, shouldAutoRefund } from "./refund-policy";

describe("shouldAutoRefund",
() =>
{
  it("debería reembolsar turno pagado con pago y reembolso auto activo",
  () =>
  {
    expect(
      shouldAutoRefund({ reembolsoAuto: true, estado: "pagado", mpPaymentId: "123" }),
    ).toBe(true);
  });

  it("debería no reembolsar sin pago de MercadoPago",
  () =>
  {
    expect(
      shouldAutoRefund({ reembolsoAuto: true, estado: "pagado", mpPaymentId: null }),
    ).toBe(false);
  });

  it("debería respetar el toggle de reembolso del servicio",
  () =>
  {
    expect(
      shouldAutoRefund({ reembolsoAuto: false, estado: "pagado", mpPaymentId: "123" }),
    ).toBe(false);
  });

  it("debería solo reembolsar turnos pagados",
  () =>
  {
    for (const estado of ["pendiente", "confirmado", "completado", "cancelado", "ausente"] as const)
    {
      expect(shouldAutoRefund({ reembolsoAuto: true, estado, mpPaymentId: "123" })).toBe(false);
    }
  });

  it("debería reembolsar si faltan más de 72hs (default)",
  () =>
  {
    expect(
      shouldAutoRefund({ reembolsoAuto: true, estado: "pagado", mpPaymentId: "123", horasRestantes: 73 }),
    ).toBe(true);
  });

  it("debería retener la seña si faltan 72hs o menos",
  () =>
  {
    expect(
      shouldAutoRefund({ reembolsoAuto: true, estado: "pagado", mpPaymentId: "123", horasRestantes: 72 }),
    ).toBe(false);
    expect(
      shouldAutoRefund({ reembolsoAuto: true, estado: "pagado", mpPaymentId: "123", horasRestantes: 2 }),
    ).toBe(false);
  });

  it("debería respetar la retención configurable del negocio",
  () =>
  {
    expect(
      shouldAutoRefund({
        reembolsoAuto: true, estado: "pagado", mpPaymentId: "123",
        horasRestantes: 100, retencionHs: 168,
      }),
    ).toBe(false);
    expect(
      shouldAutoRefund({
        reembolsoAuto: true, estado: "pagado", mpPaymentId: "123",
        horasRestantes: 169, retencionHs: 168,
      }),
    ).toBe(true);
  });

  it("debería normalizar la retención inválida a 72hs",
  () =>
  {
    expect(resolverRetencionHs(undefined)).toBe(72);
    expect(resolverRetencionHs(0)).toBe(72);
    expect(resolverRetencionHs(1000)).toBe(72);
    expect(resolverRetencionHs(48)).toBe(48);
  });

  it("debería calcular horas restantes entre inicio y ahora",
  () =>
  {
    const ahora = new Date("2026-01-01T12:00:00Z");
    const inicio = new Date("2026-01-04T12:00:00Z");

    expect(horasRestantesPara(inicio, ahora)).toBe(72);
  });
});
