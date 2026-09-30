/**
 * Montos de reserva (Módulo 2): precio efectivo y seña en centavos.
 *
 * Función pura para TDD. El precio promocional (oferta flash) tiene
 * prioridad sobre el base; la lista negra puede forzar seña del 100%.
 */

import { calculateDepositAmount } from "@/lib/ports/payment";

export interface MontosReservaInput
{
  readonly precioBase: number;
  readonly precioPromocional: number | null;
  readonly senaRequerida: boolean;
  readonly senaPorcentaje: number;
  readonly senaForzadaPorListaNegra?: boolean;
}

export interface MontosReserva
{
  readonly montoTotal: number;
  readonly senaMonto: number | null;
  readonly senaPorcentaje: number;
}

const FULL_DEPOSIT_PERCENTAGE = 100;

/** Calcula el total a cobrar y la seña según promo, servicio y lista negra. */
export function calcularMontosReserva(input: MontosReservaInput): MontosReserva
{
  if (!Number.isInteger(input.precioBase) || input.precioBase <= 0)
  {
    throw new RangeError("El precio base debe ser un entero positivo en centavos.");
  }

  if (input.precioPromocional !== null
    && (!Number.isInteger(input.precioPromocional) || input.precioPromocional <= 0))
  {
    throw new RangeError("El precio promocional debe ser un entero positivo en centavos.");
  }

  const montoTotal = input.precioPromocional ?? input.precioBase;

  if (input.senaForzadaPorListaNegra === true)
  {
    return { montoTotal, senaMonto: montoTotal, senaPorcentaje: FULL_DEPOSIT_PERCENTAGE };
  }

  if (!input.senaRequerida || input.senaPorcentaje === 0)
  {
    return { montoTotal, senaMonto: null, senaPorcentaje: input.senaPorcentaje };
  }

  return {
    montoTotal,
    senaMonto: calculateDepositAmount(montoTotal, input.senaPorcentaje),
    senaPorcentaje: input.senaPorcentaje,
  };
}

/**
 * Indica si el servicio exige un cobro de seña efectivo.
 *
 * Normaliza "seña 0% = sin seña": el tilde prendido con porcentaje 0
 * confirma instantáneo y nunca muestra etiqueta ni banner de seña.
 */
export function tieneSenaEfectiva(senaRequerida: boolean, senaPorcentaje: number): boolean
{
  return senaRequerida === true && senaPorcentaje > 0;
}
