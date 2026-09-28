import { describe, expect, it } from "vitest";

import { resolveCheckout } from "./checkout";
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

  it("debería rechazar porcentajes de seña inválidos",
  () =>
  {
    expect(() => resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: 0 })))
      .toThrow(RangeError);
    expect(() => resolveCheckout(input({ serviceRequiresDeposit: true, serviceDepositPercentage: 101 })))
      .toThrow(RangeError);
  });
});
