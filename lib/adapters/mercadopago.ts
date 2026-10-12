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
 * Indica si el token es de prueba (prefijo `TEST-`).
 *
 * Con token de prueba el checkout productivo rechaza a los pagadores
 * ("una de las partes es de prueba"): hay que redirigir al
 * `sandbox_init_point` que devuelve la misma preferencia.
 *
 * @param token Access token del negocio ya validado.
 * @return Verdadero cuando es token de prueba.
 */
export function esTokenPrueba(token: string): boolean
{
  return token.startsWith("TEST-");
}

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

    const data = (await response.json()) as {
      id?: string; init_point?: string; sandbox_init_point?: string;
    };

    if (typeof data.id !== "string" || data.id.length === 0)
    {
      throw new Error("Respuesta inválida de MercadoPago al crear la seña.");
    }

    const enSandbox = esTokenPrueba(token);
    const checkoutUrl = enSandbox && typeof data.sandbox_init_point === "string"
      && data.sandbox_init_point.length > 0
      ? data.sandbox_init_point
      : data.init_point;

    if (typeof checkoutUrl !== "string" || checkoutUrl.length === 0)
    {
      throw new Error("Respuesta inválida de MercadoPago al crear la seña.");
    }

    return { id: data.id, checkoutUrl, amountCents };
  }

  async refundPayment(paymentId: string, accessToken?: string | null, idempotencyKey?: string): Promise<void>
  {
    const token = requireBusinessMpToken(accessToken ?? null);
    const headers: Record<string, string> =
    {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (typeof idempotencyKey === "string" && idempotencyKey.length > 0)
    {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    const response = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok)
    {
      throw new Error("No se pudo devolver la seña en MercadoPago.");
    }
  }
}
