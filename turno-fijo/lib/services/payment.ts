import { MercadoPagoAdapter } from "@/lib/adapters/mercadopago";
import { readEnv } from "@/lib/env/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class PaymentService
{
  private adapter: MercadoPagoAdapter;

  constructor()
  {
    this.adapter = new MercadoPagoAdapter();
  }

  async createDepositPreference(
    bookingId: string,
    amountCents: number,
    percentage: number,
    description: string,
  ): Promise<{ id: string; initPoint: string; amountCents: number }>
  {
    const input = {
      amountCents,
      percentage,
      description,
      bookingId,
    };

    const result = await this.adapter.createDepositPreference(input);
    return {
      id: result.id,
      initPoint: result.checkoutUrl,
      amountCents: result.amountCents,
    };
  }

  async refundPayment(paymentId: string, amountCents: number): Promise<void>
  {
    await this.adapter.refundPayment(paymentId);
  }

  async getPaymentStatus(paymentId: string): Promise<{ id: string; status: string }>
  {
    const token = readEnv("MP_ACCESS_TOKEN");
    if (!token) throw new Error("MP_ACCESS_TOKEN not configured");

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok)
    {
      throw new Error(`Failed to fetch payment status: ${response.status}`);
    }

    const data = await response.json();
    return { id: data.id, status: data.status };
  }
}

export const paymentService = new PaymentService();