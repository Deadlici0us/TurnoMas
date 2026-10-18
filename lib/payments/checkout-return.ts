/**
 * Detección del retorno desde el checkout de suscripción de MercadoPago.
 *
 * MercadoPago puede devolver la `back_url` con un `?` extra
 * (`?suscripcion=ok?preapproval_id=...`), lo que hace que `URLSearchParams`
 * lea todo como un único valor `suscripcion = "ok?preapproval_id=..."`. Por eso
 * la detección acepta `suscripcion` que empiece con `"ok"` o la presencia de
 * `preapproval_id`, en lugar de comparar por igualdad estricta.
 */

export interface RetornoCheckoutParams
{
  readonly suscripcion?: string | null;
  readonly preapproval_id?: string | null;
}

/**
 * Indica si la navegación corresponde a la vuelta del checkout de MercadoPago.
 *
 * @param params Parámetros de query de la página de facturación.
 * @return `true` si volvió del checkout con un pago iniciado.
 */
export function esRetornoCheckout(params: RetornoCheckoutParams): boolean
{
  const suscripcion = typeof params.suscripcion === "string" ? params.suscripcion : "";
  const preapprovalId = typeof params.preapproval_id === "string" ? params.preapproval_id : "";

  return suscripcion.startsWith("ok") || preapprovalId.length > 0;
}
