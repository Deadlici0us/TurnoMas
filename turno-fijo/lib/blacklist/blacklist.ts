/**
 * Lista negra automatizada (Módulo 4): penaliza al cliente identificado
 * por WhatsApp cuando sus ausencias *alcanzan o superan* el umbral del negocio.
 *
 * Función pura para facilitar TDD y reutilización en
 * Route Handlers y Server Actions.
 */

export type BlacklistPenalty = "blocked" | "fullDeposit";

export type BlacklistDecision = "allowed" | BlacklistPenalty;

export interface BlacklistPolicy
{
  readonly maxAllowedAbsences: number;
  readonly penaltyOnExceed: BlacklistPenalty;
}

/** Evalúa si un cliente puede reservar según sus ausencias y la política del negocio. */
export function evaluateCustomer(absences: number, policy: BlacklistPolicy): BlacklistDecision
{
  if (!Number.isInteger(absences) || absences < 0)
  {
    throw new RangeError("Las ausencias deben ser un entero no negativo.");
  }

  if (!Number.isInteger(policy.maxAllowedAbsences) || policy.maxAllowedAbsences < 0)
  {
    throw new RangeError("El umbral debe ser un entero no negativo.");
  }

  if (absences >= policy.maxAllowedAbsences)
  {
    return policy.penaltyOnExceed;
  }

  return "allowed";
}
