/**
 * Adaptador MercadoPago para IPaymentGateway (PLAN.md 2.1).
 *
 * Usa MP_ACCESS_TOKEN vía REST (sin SDK). La lectura del secret es
 * perezosa: importar el módulo nunca lanza; solo falla al operar sin env.
 */

import { readEnv } from "@/lib/env/env";
import { calculateDepositAmount } from "@/lib/ports/payment";
import type {
  CreateDepositPreferenceInput,
  DepositPreference,
  IPaymentGateway,
} from "@/lib/ports/payment";

const MP_API_BASE = "https://api.mercadopago.com";

/** Adaptador real: crea preferencias de seña y reembolsa pagos. */
export class MercadoPagoAdapter implements IPaymentGateway
{
  async createDepositPreference(input: CreateDepositPreferenceInput): Promise<DepositPreference>
  {
    const token = input.accessToken ?? readEnv("MP_ACCESS_TOKEN");

    if (token === null)
    {
      throw new Error("El negocio aún no conectó MercadoPago para cobrar señas.");
    }

    const amountCents = calculateDepositAmount(input.amountCents, input.percentage);

    const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ title: input.description, quantity: 1, unit_price: amountCents / 100 }],
        external_reference: input.bookingId,
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
    const token = accessToken ?? readEnv("MP_ACCESS_TOKEN");

    if (token === null)
    {
      throw new Error("El negocio aún no conectó MercadoPago para devolver señas.");
    }

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
