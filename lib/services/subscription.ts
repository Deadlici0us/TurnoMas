import { readEnv } from "@/lib/env/env";
import {
  buscarPreapprovalPorEmail,
  buscarPreapprovalsPorEstado,
  cancelarPreapproval,
  consultarCobroSuscripcion,
  consultarPreapproval,
  crearPreapproval,
  resolverPlanPais,
  type PreapprovalResumen,
} from "@/lib/payments/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

export class SubscriptionService
{
  /** Crea la suscripción (sin plan, `pending`) y devuelve el link de pago de MP. */
  async crearParaNegocio(
    negocioId: string,
    payerEmail: string,
    pais: string | null,
  ): Promise<{ id: string; initPoint: string; status: string }>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    const plan = resolverPlanPais(pais);

    const publicUrl = readEnv("NEXT_PUBLIC_APP_URL");
    const vercelUrl = readEnv("VERCEL_URL");
    const base = publicUrl ?? (vercelUrl !== null ? `https://${stripTrailingSlashes(vercelUrl)}` : null);

    if (base === null)
    {
      throw new Error("No pudimos resolver la URL pública para la suscripción.");
    }

    return crearPreapproval({
      negocioId,
      payerEmail,
      backUrl: `${stripTrailingSlashes(base)}/dashboard/facturacion?suscripcion=ok`,
      notificationUrl: `${stripTrailingSlashes(base)}/api/webhooks`,
      monto: plan.monto,
      currency: plan.currency,
      platformToken,
    });
  }

  /**
   * Reconcilia el plan del negocio contra MercadoPago, sin depender del webhook.
   *
   * Busca los preapprovals del negocio (`external_reference`). Si hay alguno
   * `authorized`, activa el plan con el más reciente y cancela los duplicados
   * (para evitar cobros recurrentes múltiples). Si sólo hay `pending`, lo
   * reutiliza devolviendo su `init_point`. `none` si no hay nada.
   */
  async reconciliar(negocioId: string): Promise<{
    readonly estado: "active" | "pending" | "none";
    readonly preapprovalId: string | null;
    readonly initPoint: string | null;
  }>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    const ordenarPorFecha = (filas: PreapprovalResumen[]): PreapprovalResumen[] =>
      [...filas].sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));

    const delNegocio = (filas: PreapprovalResumen[]): PreapprovalResumen[] =>
      filas.filter((fila) => fila.externalReference === negocioId);

    const autorizadas = ordenarPorFecha(
      delNegocio(await buscarPreapprovalsPorEstado("authorized", platformToken)));
    const pendientes = ordenarPorFecha(
      delNegocio(await buscarPreapprovalsPorEstado("pending", platformToken)));

    if (autorizadas.length > 0)
    {
      const elegida = autorizadas[0];
      await this.activarSuscripcion(negocioId, elegida.id);

      for (const duplicada of [...autorizadas.slice(1), ...pendientes])
      {
        await cancelarPreapproval(duplicada.id, platformToken).catch(() => undefined);
      }

      return { estado: "active", preapprovalId: elegida.id, initPoint: null };
    }

    if (pendientes.length > 0)
    {
      const elegida = pendientes[0];

      for (const duplicada of pendientes.slice(1))
      {
        await cancelarPreapproval(duplicada.id, platformToken).catch(() => undefined);
      }

      return { estado: "pending", preapprovalId: elegida.id, initPoint: elegida.initPoint };
    }

    return { estado: "none", preapprovalId: null, initPoint: null };
  }

  /** Activa el plan del negocio con el ID del preapproval autorizado. */
  async activarSuscripcion(negocioId: string, preapprovalId: string): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_estado: "active",
      suscripcion_mp_id: preapprovalId,
      suscripcion_mora_desde: null,
    }).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos activar la suscripción. Probá de nuevo.");
    }
  }

  /** Marca mora con inicio para la gracia de `past_due`. */
  async marcarPastDue(negocioId: string, desde: Date = new Date()): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_estado: "past_due",
      suscripcion_mora_desde: desde.toISOString(),
    }).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos registrar la mora. Probá de nuevo.");
    }
  }

  /** Limpia el plan local (el trial por fecha decide trial vs blocked). */
  async cancelarSuscripcionLocal(negocioId: string): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_estado: "blocked",
      suscripcion_mp_id: null,
      suscripcion_mora_desde: null,
    }).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos cancelar la suscripción. Probá de nuevo.");
    }
  }

  /** Consulta un preapproval con el token de plataforma. */
  async consultarEstado(preapprovalId: string): Promise<{ status: string; externalReference: string | null }>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    const estado = await consultarPreapproval(preapprovalId, platformToken);

    return { status: estado.status, externalReference: estado.externalReference };
  }

  /** Cancela en MP y limpia el plan local. */
  async cancelarParaNegocio(negocioId: string, preapprovalId: string): Promise<void>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    await cancelarPreapproval(preapprovalId, platformToken);
    await this.cancelarSuscripcionLocal(negocioId);
  }

  /**
   * Resuelve el negocio dueño de un cobro recurrente.
   *
   * Cadena: pago (cuenta plataforma) → email del pagador → preapproval
   * → `external_reference` (negocio). Null si algún eslabón falla.
   */
  async resolverNegocioDeCobro(paymentId: string): Promise<{
    readonly negocioId: string;
    readonly preapprovalId: string;
    readonly status: string;
  } | null>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      return null;
    }

    try
    {
      const cobro = await consultarCobroSuscripcion(paymentId, platformToken);

      if (cobro.payerEmail === null)
      {
        return null;
      }

      const preapproval = await buscarPreapprovalPorEmail(cobro.payerEmail, platformToken);

      if (preapproval === null || preapproval.externalReference === null)
      {
        return null;
      }

      return {
        negocioId: preapproval.externalReference,
        preapprovalId: preapproval.id,
        status: cobro.status,
      };
    }
    catch
    {
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
