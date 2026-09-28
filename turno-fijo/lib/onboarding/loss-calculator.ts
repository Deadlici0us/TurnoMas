/**
 * Calculadora de pérdidas por inasistencias (Módulo 1, landing).
 *
 * Estima la pérdida mensual: turnos semanales × 4 semanas
 * × valor promedio × tasa de ausencia.
 *
 * Función pura para facilitar TDD y reutilización en
 * componentes cliente y Server Components.
 */

const WEEKS_PER_MONTH = 4;

export interface LossCalculatorInput
{
  readonly turnosPorSemana: number;
  readonly valorPromedio: number;
  readonly tasaAusencia: number;
}

/** Estima la pérdida mensual en pesos, redondeada al entero más cercano. */
export function estimateMonthlyLoss(input: LossCalculatorInput): number
{
  if (!Number.isFinite(input.turnosPorSemana) || input.turnosPorSemana <= 0)
  {
    throw new RangeError("Los turnos por semana deben ser un número positivo.");
  }

  if (!Number.isFinite(input.valorPromedio) || input.valorPromedio <= 0)
  {
    throw new RangeError("El valor promedio debe ser un número positivo.");
  }

  if (!Number.isFinite(input.tasaAusencia) || input.tasaAusencia < 0 || input.tasaAusencia > 1)
  {
    throw new RangeError("La tasa de ausencia debe estar entre 0 y 1.");
  }

  return Math.round(input.turnosPorSemana * WEEKS_PER_MONTH * input.valorPromedio * input.tasaAusencia);
}
