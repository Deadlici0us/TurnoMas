/**
 * Adaptador MercadoPago para IPaymentGateway (PLAN.md 2.1).
 *
 * Señas delegadas fail-closed: el `accessToken` del negocio es obligatorio;
 * este adaptador nunca usa el token de la plataforma. Solo realiza red,
 * nunca lee `negocio_secretos` (eso lo resuelve `PaymentService`).
 */

import { readEnv } from "@/lib/env/env";
import { requireBusinessMpToken } from "@/lib/payments/mp-token";
import { calculateDepositAmount } from "@/lib/ports/payment";
import type {
  CreateDepositPreferenceInput,
  DepositPreference,
  IPaymentGateway,
} from "@/lib/ports/payment";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

const MP_API_BASE = "https://api.mercadopago.com";

/**
 * URL de webhook propia para `notification_url` por preferencia.
 *
 * Con señas delegadas el pago vive en la cuenta del negocio: esta URL hace
 * que MP nos avise sin que el dueño configure nada en su panel (además del
 * webhook a nivel aplicación). Null si no hay base pública resoluble.
 */
export function resolveMpWebhookUrl(): string | null
{
  const publicUrl = readEnv("NEXT_PUBLIC_APP_URL");
  const base = publicUrl ?? (readEnv("VERCEL_URL") !== null
    ? `https://${readEnv("VERCEL_URL") as string}`
    : null);

  return base === null ? null : `${stripTrailingSlashes(base)}/api/webhooks`;
}

/** Adaptador real: crea preferencias de seña y reembolsa pagos. */
export class MercadoPagoAdapter implements IPaymentGateway
{
  async createDepositPreference(input: CreateDepositPreferenceInput): Promise<DepositPreference>
  {
    const token = requireBusinessMpToken(input.accessToken ?? null);
    const amountCents = calculateDepositAmount(input.amountCents, input.percentage);
    const notificationUrl = resolveMpWebhookUrl();

    const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ title: input.description, quantity: 1, unit_price: amountCents / 100 }],
        external_reference: input.bookingId,
        ...(notificationUrl === null ? {} : { notification_url: notificationUrl }),
      }),
    });

    if (!response.ok)
    {
      throw new Error("No se pudo crear la preferencia de pago en MercadoPago.");
    }

    const data = (await response.json()) as { id?: string; init_point?: string };

    if (!data.id || !data.init_point)
    {
      throw new Error("Respuesta inválida de MercadoPago al crear la seña.");
    }

    return { id: data.id, checkoutUrl: data.init_point, amountCents };
  }

  async refundPayment(paymentId: string, accessToken?: string | null): Promise<void>
  {
    const token = requireBusinessMpToken(accessToken ?? null);

    const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok)
    {
      throw new Error("No se pudo devolver la seña en MercadoPago.");
    }
  }
}
