import { describe, expect, it } from "vitest";

import { shouldAutoRefund } from "./refund-policy";

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
    for (const estado of ["pendiente", "completado", "cancelado", "ausente"] as const)
    {
      expect(shouldAutoRefund({ reembolsoAuto: true, estado, mpPaymentId: "123" })).toBe(false);
    }
  });
});
