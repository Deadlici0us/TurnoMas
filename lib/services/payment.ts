import { MercadoPagoAdapter } from "@/lib/adapters/mercadopago";
import { readEnv } from "@/lib/env/env";
import { resolveEffectiveMpToken } from "@/lib/payments/mp-token";
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
    return this.createDepositPreferenceForNegocio(null, bookingId, amountCents, percentage,
      description);
  }

  /** Crea la seña con el token del negocio (fallback a plataforma). */
  async createDepositPreferenceForNegocio(
    negocioId: string | null,
    bookingId: string,
    amountCents: number,
    percentage: number,
    description: string,
  ): Promise<{ id: string; initPoint: string; amountCents: number }>
  {
    const accessToken = negocioId === null
      ? readEnv("MP_ACCESS_TOKEN")
      : await this.getBusinessAccessToken(negocioId);
    const input = {
      amountCents,
      percentage,
      description,
      bookingId,
      accessToken,
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

  /** Devuelve la seña con el token del negocio (fallback a plataforma). */
  async refundForNegocio(negocioId: string, paymentId: string): Promise<void>
  {
    await this.adapter.refundPayment(paymentId, await this.getBusinessAccessToken(negocioId));
  }

  /** Lee el token del negocio en `negocio_secretos` (null si no conectó). */
  async getBusinessAccessToken(negocioId: string): Promise<string | null>
  {
    try
    {
      const admin = getSupabaseAdmin();
      const { data } = await admin.from("negocio_secretos")
        .select("mercadopago_access_token").eq("negocio_id", negocioId).single();

      const business = typeof (data as { mercadopago_access_token?: unknown } | null)
        ?.mercadopago_access_token === "string"
        ? (data as { mercadopago_access_token: string }).mercadopago_access_token
        : null;

      return resolveEffectiveMpToken(business, readEnv("MP_ACCESS_TOKEN"));
    }
    catch
    {
      return readEnv("MP_ACCESS_TOKEN");
    }
  }

  async getPaymentStatus(paymentId: string, accessToken?: string | null): Promise<{ id: string; status: string; externalReference: string | null }>
  {
    const token = accessToken ?? readEnv("MP_ACCESS_TOKEN");
    if (!token) throw new Error("El negocio aún no conectó MercadoPago para cobrar señas.");

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