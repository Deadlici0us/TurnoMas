import { MercadoPagoAdapter } from "@/lib/adapters/mercadopago";
import { readEnv } from "@/lib/env/env";
import { refreshMpAccessToken } from "@/lib/payments/mp-oauth";
import { NegocioSinMpError, requireBusinessMpToken } from "@/lib/payments/mp-token";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class PaymentService
{
  private readonly adapter: MercadoPagoAdapter;

  constructor()
  {
    this.adapter = new MercadoPagoAdapter();
  }

  /** Crea la seña con el token del negocio (fail-closed: exige conexión). */
  async createDepositPreferenceForNegocio(
    negocioId: string,
    bookingId: string,
    amountCents: number,
    percentage: number,
    description: string,
  ): Promise<{ id: string; initPoint: string; amountCents: number }>
  {
    const accessToken = requireBusinessMpToken(await this.getBusinessAccessToken(negocioId));
    const input = {
      amountCents,
      percentage,
      description,
      bookingId,
      accessToken,
    };

    try
    {
      const result = await this.adapter.createDepositPreference(input);

      return {
        id: result.id,
        initPoint: result.checkoutUrl,
        amountCents: result.amountCents,
      };
    }
    catch (original)
    {
      // El token pudo vencer (dura 180 días): renovar una vez y reintentar.
      // Sin refresh disponible se propaga el error original.
      let renovado: string;

      try
      {
        renovado = await this.refreshBusinessToken(negocioId);
      }
      catch
      {
        throw original;
      }

      const result = await this.adapter.createDepositPreference({ ...input, accessToken: renovado });

      return {
        id: result.id,
        initPoint: result.checkoutUrl,
        amountCents: result.amountCents,
      };
    }
  }

  /** Devuelve la seña con el token del negocio (fail-closed: exige conexión). */
  async refundForNegocio(
    negocioId: string,
    paymentId: string,
    idempotencyKey?: string,
  ): Promise<{ refundId: string | null }>
  {
    const accessToken = requireBusinessMpToken(await this.getBusinessAccessToken(negocioId));

    try
    {
      return await this.adapter.refundPayment(paymentId, accessToken, idempotencyKey);
    }
    catch (original)
    {
      let renovado: string;

      try
      {
        renovado = await this.refreshBusinessToken(negocioId);
      }
      catch
      {
        throw original;
      }

      return await this.adapter.refundPayment(paymentId, renovado, idempotencyKey);
    }
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

      return business !== null && business.trim().length > 0 ? business : null;
    }
    catch
    {
      return null;
    }
  }

  /**
   * Renueva el token del negocio con su `refresh_token` y lo persiste.
   *
   * @param negocioId ID del negocio.
   * @return Nuevo `access_token`.
   */
  async refreshBusinessToken(negocioId: string): Promise<string>
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("negocio_secretos")
      .select("mercadopago_refresh_token").eq("negocio_id", negocioId).single();

    const refreshToken = typeof (data as { mercadopago_refresh_token?: unknown } | null)
      ?.mercadopago_refresh_token === "string"
      ? (data as { mercadopago_refresh_token: string }).mercadopago_refresh_token
      : null;

    if (refreshToken === null || refreshToken.trim().length === 0)
    {
      throw new NegocioSinMpError("La conexión con MercadoPago venció. Conectá de nuevo.");
    }

    const clientId = readEnv("MP_CLIENT_ID");
    const clientSecret = readEnv("MP_CLIENT_SECRET");

    if (clientId === null || clientSecret === null)
    {
      throw new Error("Falta configurar MP_CLIENT_ID en el entorno.");
    }

    let tokens;

    try
    {
      tokens = await refreshMpAccessToken({ refreshToken, clientId, clientSecret });
    }
    catch
    {
      throw new NegocioSinMpError("La conexión con MercadoPago fue revocada. Conectá de nuevo.");
    }

    await admin.from("negocio_secretos").update({
      mercadopago_access_token: tokens.accessToken,
      mercadopago_refresh_token: tokens.refreshToken,
    }).eq("negocio_id", negocioId);

    return tokens.accessToken;
  }

  /**
   * Lista los tokens MP conectados (server-only, nunca loguear).
   *
   * Se usa para resolver webhooks de señas delegadas: el pago vive en la
   * cuenta de algún negocio y el webhook solo trae el ID del pago.
   *
   * @return Tokens no vacíos de `negocio_secretos`.
   */
  async listConnectedBusinessTokens(): Promise<string[]>
  {
    try
    {
      const admin = getSupabaseAdmin();
      const { data } = await admin.from("negocio_secretos")
        .select("mercadopago_access_token");

      if (!Array.isArray(data))
      {
        return [];
      }

      return (data as { mercadopago_access_token?: unknown }[])
        .map((row) => row.mercadopago_access_token)
        .filter((token): token is string => typeof token === "string" && token.trim().length > 0);
    }
    catch
    {
      return [];
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
