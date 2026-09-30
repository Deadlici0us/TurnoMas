import { describe, expect, it } from "vitest";

import { requierePagoSena, resolveCheckout } from "./checkout";
import type { CheckoutInput } from "./checkout";

function input(overrides: Partial<CheckoutInput> = {}): CheckoutInput
{
  return {
    serviceRequiresDeposit: false,
    serviceDepositPercentage: 50,
    blacklistDecision: "allowed",
    ...overrides,
  };
}

describe("resolveCheckout",
() =>
{
  it("debería confirmar instantáneo cuando no hay seña ni penalidad",
  () =>
  {
    expect(resolveCheckout(input())).toEqual({ kind: "confirmed" });
  });

  it("debería redirigir a MercadoPago con la seña del servicio",
  () =>
  {
    const result = resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: 50 }));

    expect(result).toEqual({ kind: "payDeposit", percentage: 50 });
  });

  it("debería rechazar cuando el cliente está bloqueado aunque pague",
  () =>
  {
    const result = resolveCheckout(
      input({ serviceRequiresDeposit: true, blacklistDecision: "blocked" }),
    );

    expect(result).toEqual({ kind: "rejected", reason: "blacklisted" });
  });

  it("debería exigir seña del 100% con penalidad aunque el servicio no pida seña",
  () =>
  {
    const result = resolveCheckout(input({ blacklistDecision: "fullDeposit" }));

    expect(result).toEqual({ kind: "payDeposit", percentage: 100 });
  });

  it("debería elevar la seña al 100% con penalidad aunque el servicio pida menos",
  () =>
  {
    const result = resolveCheckout(
      input({
        serviceRequiresDeposit: true,
        serviceDepositPercentage: 30,
        blacklistDecision: "fullDeposit",
      }),
    );

    expect(result).toEqual({ kind: "payDeposit", percentage: 100 });
  });

  it("debería confirmar instantáneo con seña 0% aunque se exija seña",
  () =>
  {
    const result = resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: 0 }));

    expect(result).toEqual({ kind: "confirmed" });
  });

  it("debería rechazar porcentajes de seña inválidos",
  () =>
  {
    expect(() => resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: -1 })))
      .toThrow(RangeError);
    expect(() => resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: 101 })))
      .toThrow(RangeError);
  });
});

describe("requierePagoSena",
() =>
{
  it("debería requerir pago con seña mayor a 0",
  () =>
  {
    expect(requierePagoSena({ kind: "payDeposit", percentage: 50 }, 750000)).toBe(true);
    expect(requierePagoSena({ kind: "payDeposit", percentage: 100 }, 1500000)).toBe(true);
  });

  it("debería confirmar sin pago cuando el monto de seña es 0 o nulo",
  () =>
  {
    expect(requierePagoSena({ kind: "payDeposit", percentage: 50 }, 0)).toBe(false);
    expect(requierePagoSena({ kind: "payDeposit", percentage: 50 }, null)).toBe(false);
  });

  it("debería confirmar sin pago cuando el checkout ya es confirmado o rechazado",
  () =>
  {
    expect(requierePagoSena({ kind: "confirmed" }, 750000)).toBe(false);
    expect(requierePagoSena({ kind: "rejected", reason: "blacklisted" }, 750000)).toBe(false);
  });
});
