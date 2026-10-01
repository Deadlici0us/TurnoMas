/**
 * Política de reembolso automático (Módulo 5, Gestor de Reembolsos).
 *
 * Al cancelar un turno `pagado` con `mp_payment_id` y `reembolso_auto`
 * activo en el servicio, se devuelve la seña vía MercadoPago salvo que
 * la cancelación caiga dentro de la ventana de retención del negocio
 * (`sena_retencion_hs`, default 72): ahí el cliente pierde la seña.
 * `confirmado` nunca reembolsa: no hubo cobro online.
 */

export type RefundableEstado = "pendiente" | "confirmado" | "pagado" | "completado" | "cancelado" | "ausente";

export const RETENCION_DEFAULT_HS = 72;
export const RETENCION_MIN_HS = 1;
export const RETENCION_MAX_HS = 720;

export interface RefundPolicyInput
{
  readonly reembolsoAuto: boolean;
  readonly estado: RefundableEstado;
  readonly mpPaymentId: string | null;
  readonly horasRestantes?: number | null;
  readonly retencionHs?: number | null;
}

/** Normaliza el umbral de retención del negocio (default 72hs). */
export function resolverRetencionHs(valor: unknown): number
{
  if (typeof valor !== "number" || !Number.isFinite(valor))
  {
    return RETENCION_DEFAULT_HS;
  }

  const entero = Math.floor(valor);

  if (entero < RETENCION_MIN_HS || entero > RETENCION_MAX_HS)
  {
    return RETENCION_DEFAULT_HS;
  }

  return entero;
}

/** Horas (fraccionales) entre ahora y el inicio del turno. Negativo si ya pasó. */
export function horasRestantesPara(inicio: Date, ahora: Date): number
{
  return (inicio.getTime() - ahora.getTime()) / 3_600_000;
}

/** Indica si corresponde devolver la seña automáticamente al cancelar. */
export function shouldAutoRefund(input: RefundPolicyInput): boolean
{
  if (!input.reembolsoAuto || input.estado !== "pagado")
  {
    return false;
  }

  if (input.mpPaymentId === null || input.mpPaymentId.trim().length === 0)
  {
    return false;
  }

  if (input.horasRestantes === undefined || input.horasRestantes === null)
  {
    return true;
  }

  if (!Number.isFinite(input.horasRestantes))
  {
    return true;
  }

  return input.horasRestantes > resolverRetencionHs(input.retencionHs);
}
