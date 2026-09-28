import { MercadoPagoAdapter } from "@/lib/adapters/mercadopago";
import { readEnv } from "@/lib/env/env";

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

  async refundPayment(paymentId: string, _amountCents: number): Promise<void>
  {
    void _amountCents;
    await this.adapter.refundPayment(paymentId);
  }

  async getPaymentStatus(paymentId: string): Promise<{ id: string; status: string; externalReference: string | null }>
  {
    const token = readEnv("MP_ACCESS_TOKEN");
    if (!token) throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok)
    {
      throw new Error(`No se pudo consultar el estado del pago: ${response.status}`);
    }

    const data = await response.json();
    const externalReference = typeof data.external_reference === "string" ? data.external_reference : null;
    return { id: data.id, status: data.status, externalReference };
  }
}

export const paymentService = new PaymentService();