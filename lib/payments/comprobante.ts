/**
 * URLs de comprobantes de MercadoPago para la UI.
 *
 * Los pagos de señas guardan `turnos.mp_payment_id` y la suscripción SaaS
 * guarda `negocios.suscripcion_mp_id` (preapproval). Estos helpers construyen
 * el link al detalle en MercadoPago sin red ni tokens: el dueño lo abre
 * logueado en su cuenta. Null cuando no hay ID (fila sin pago).
 */

/** Dominio de MercadoPago según país del negocio (AR por defecto). */
export function dominioMpPorPais(pais: string | null | undefined): string
{
  const codigo = (pais ?? "").trim().toLowerCase();

  if (codigo === "mx")
  {
    return "www.mercadopago.com.mx";
  }

  return "www.mercadopago.com.ar";
}

/**
 * Link al comprobante completo de un pago (detalle de actividad).
 *
 * @param paymentId ID del pago (`mp_payment_id`) o null.
 * @param pais País del negocio para el dominio (`ar`, `mx`).
 * @return URL al detalle o null sin ID.
 */
export function comprobantePagoUrl(
  paymentId: string | null | undefined,
  pais: string | null = null,
): string | null
{
  if (paymentId === null || paymentId === undefined)
  {
    return null;
  }

  const id = paymentId.trim();

  if (id.length === 0)
  {
    return null;
  }

  return `https://${dominioMpPorPais(pais)}/activities/payment-detail/${encodeURIComponent(id)}`;
}

/**
 * Link al detalle de la suscripción SaaS (preapproval).
 *
 * @param preapprovalId ID del preapproval (`suscripcion_mp_id`) o null.
 * @param pais País del negocio para el dominio (`ar`, `mx`).
 * @return URL al detalle o null sin ID.
 */
export function comprobanteSuscripcionUrl(
  preapprovalId: string | null | undefined,
  pais: string | null = null,
): string | null
{
  if (preapprovalId === null || preapprovalId === undefined)
  {
    return null;
  }

  const id = preapprovalId.trim();

  if (id.length === 0)
  {
    return null;
  }

  return `https://${dominioMpPorPais(pais)}/subscriptions/detail/${encodeURIComponent(id)}`;
}
