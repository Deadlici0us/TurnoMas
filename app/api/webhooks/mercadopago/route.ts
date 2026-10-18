/**
 * Alias del webhook de MercadoPago en `/api/webhooks/mercadopago`.
 *
 * La URL configurada en el panel de MP apunta a este path; reusa el mismo
 * handler de `/api/webhooks` para no duplicar la lógica de firma/suscripción.
 */

export { GET, POST } from "../route";
