import { describe, expect, it } from "vitest";

import { evaluateCustomer } from "./blacklist";
import type { BlacklistPolicy } from "./blacklist";

const BLOCK_POLICY: BlacklistPolicy =
{
  maxAllowedAbsences: 2,
  penaltyOnExceed: "blocked",
};

const DEPOSIT_POLICY: BlacklistPolicy =
{
  maxAllowedAbsences: 2,
  penaltyOnExceed: "fullDeposit",
};

describe("evaluateCustomer",
() =>
{
  it("debería permitir cuando las ausencias están por debajo del umbral",
  () =>
  {
    expect(evaluateCustomer(1, BLOCK_POLICY)).toBe("allowed");
  });

  it("debería penalizar justo en el umbral (alcanzar ya activa la penalidad)",
  () =>
  {
    expect(evaluateCustomer(2, BLOCK_POLICY)).toBe("blocked");
  });

  it("debería bloquear cuando se supera el umbral con penalidad de bloqueo",
  () =>
  {
    expect(evaluateCustomer(3, BLOCK_POLICY)).toBe("blocked");
  });

  it("debería exigir seña del 100% cuando se supera el umbral con esa penalidad",
  () =>
  {
    expect(evaluateCustomer(3, DEPOSIT_POLICY)).toBe("fullDeposit");
  });

  it("debería permitir con cero ausencias",
  () =>
  {
    expect(evaluateCustomer(0, BLOCK_POLICY)).toBe("allowed");
  });

  it("debería bloquear desde la primera ausencia cuando el umbral es uno",
  () =>
  {
    const strict: BlacklistPolicy = { maxAllowedAbsences: 1, penaltyOnExceed: "blocked" };

    expect(evaluateCustomer(0, strict)).toBe("allowed");
    expect(evaluateCustomer(1, strict)).toBe("blocked");
  });

  it("debería rechazar ausencias negativas",
  () =>
  {
    expect(() => evaluateCustomer(-1, BLOCK_POLICY)).toThrow(RangeError);
  });

  it("debería rechazar un umbral negativo",
  () =>
  {
    const invalid: BlacklistPolicy = { maxAllowedAbsences: -1, penaltyOnExceed: "blocked" };

    expect(() => evaluateCustomer(0, invalid)).toThrow(RangeError);
  });
});
