/**
 * Checkout flexible (Módulo 2): decide confirmación instantánea,
 * redirección a MercadoPago o rechazo según seña del servicio
 * y decisión de lista negra.
 *
 * Función pura para facilitar TDD y reutilización en
 * Route Handlers y Server Actions.
 */

import type { BlacklistDecision } from "../blacklist/blacklist";

export type CheckoutOutcome =
  | { readonly kind: "confirmed" }
  | { readonly kind: "payDeposit"; readonly percentage: number }
  | { readonly kind: "rejected"; readonly reason: "blacklisted" };

export interface CheckoutInput
{
  readonly serviceRequiresDeposit: boolean;
  readonly serviceDepositPercentage: number;
  readonly blacklistDecision: BlacklistDecision;
}

const FULL_DEPOSIT_PERCENTAGE = 100;
const MIN_DEPOSIT_PERCENTAGE = 0;
const MAX_DEPOSIT_PERCENTAGE = 100;

/** Resuelve el resultado del checkout para una reserva. */
export function resolveCheckout(input: CheckoutInput): CheckoutOutcome
{
  if (input.blacklistDecision === "blocked")
  {
    return { kind: "rejected", reason: "blacklisted" };
  }

  if (input.blacklistDecision === "fullDeposit")
  {
    return { kind: "payDeposit", percentage: FULL_DEPOSIT_PERCENTAGE };
  }

  if (!input.serviceRequiresDeposit)
  {
    return { kind: "confirmed" };
  }

  assertValidPercentage(input.serviceDepositPercentage);

  if (input.serviceDepositPercentage === 0)
  {
    return { kind: "confirmed" };
  }

  return { kind: "payDeposit", percentage: input.serviceDepositPercentage };
}

function assertValidPercentage(percentage: number): void
{
  if (!Number.isInteger(percentage) || percentage < MIN_DEPOSIT_PERCENTAGE || percentage > MAX_DEPOSIT_PERCENTAGE)
  {
    throw new RangeError("El porcentaje de seña debe ser un entero entre 0 y 100.");
  }
}
