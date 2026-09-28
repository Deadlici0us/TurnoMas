/**
 * Política de reembolso automático (Módulo 5, Gestor de Reembolsos).
 *
 * Al cancelar un turno `pagado` con `mp_payment_id` y `reembolso_auto`
 * activo en el servicio, se devuelve la seña vía MercadoPago.
 */

export type RefundableEstado = "pendiente" | "pagado" | "completado" | "cancelado" | "ausente";

export interface RefundPolicyInput
{
  readonly reembolsoAuto: boolean;
  readonly estado: RefundableEstado;
  readonly mpPaymentId: string | null;
}

/** Indica si corresponde devolver la seña automáticamente al cancelar. */
export function shouldAutoRefund(input: RefundPolicyInput): boolean
{
  if (!input.reembolsoAuto || input.estado !== "pagado")
  {
    return false;
  }

  return input.mpPaymentId !== null && input.mpPaymentId.trim().length > 0;
}
