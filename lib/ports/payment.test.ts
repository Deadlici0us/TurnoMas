import { describe, expect, it } from "vitest";

import { FakePaymentGateway, PaymentNotFoundError, calculateDepositAmount } from "./payment";
import type { IPaymentGateway } from "./payment";

function makeGateway(): IPaymentGateway
{
  return new FakePaymentGateway();
}

describe("calculateDepositAmount",
() =>
{
  it("debería calcular la mitad de una seña del 50%",
  () =>
  {
    expect(calculateDepositAmount(10_000, 50)).toBe(5_000);
  });

  it("debería redondear al centavo más cercano",
  () =>
  {
    expect(calculateDepositAmount(999, 50)).toBe(500);
  });

  it("debería devolver el total con seña del 100%",
  () =>
  {
    expect(calculateDepositAmount(15_000, 100)).toBe(15_000);
  });

  it("debería rechazar porcentajes inválidos",
  () =>
  {
    expect(() => calculateDepositAmount(10_000, 0)).toThrow(RangeError);
    expect(() => calculateDepositAmount(10_000, 101)).toThrow(RangeError);
  });
});

describe("FakePaymentGateway",
() =>
{
  it("debería crear una preferencia con id y url de checkout",
  async () =>
  {
    const gateway = makeGateway();

    const preference = await gateway.createDepositPreference(
    {
      bookingId: "turno-1",
      amountCents: 5_000,
      percentage: 50,
      description: "Seña turno barbería",
    });

    expect(preference.id).not.toBe("");
    expect(preference.checkoutUrl).toContain(preference.id);
    expect(preference.amountCents).toBe(5_000);
  });

  it("debería rechazar montos no positivos",
  async () =>
  {
    const gateway = makeGateway();

    await expect(gateway.createDepositPreference(
    {
      bookingId: "turno-1",
      amountCents: 0,
      percentage: 50,
      description: "Seña inválida",
    })).rejects.toThrow(RangeError);
  });

  it("debería reembolsar un pago existente",
  async () =>
  {
    const gateway = makeGateway();
    const preference = await gateway.createDepositPreference(
    {
      bookingId: "turno-1",
      amountCents: 5_000,
      percentage: 50,
      description: "Seña turno barbería",
    });

    await expect(gateway.refundPayment(preference.id)).resolves.toBeUndefined();
  });

  it("debería fallar al reembolsar un pago desconocido",
  async () =>
  {
    const gateway = makeGateway();

    await expect(gateway.refundPayment("inexistente")).rejects.toThrow(PaymentNotFoundError);
  });

  it("debería impedir doble reembolso",
  async () =>
  {
    const gateway = makeGateway();
    const preference = await gateway.createDepositPreference(
    {
      bookingId: "turno-1",
      amountCents: 5_000,
      percentage: 50,
      description: "Seña turno barbería",
    });

    await gateway.refundPayment(preference.id);

    await expect(gateway.refundPayment(preference.id)).rejects.toThrow(PaymentNotFoundError);
  });
});
