import { readEnv } from "@/lib/env/env";
import {
  MpHttpError,
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
      notificationUrl: `${stripTrailingSlashes(base)}/api/webhooks/mercadopago`,
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

  /**
   * Cancela en MP y limpia el plan local (idempotente).
   *
   * Si MP rechaza porque el preapproval ya estaba cancelado (400) o no existe
   * para el token (404), el objetivo ya está cumplido y se limpia el plan
   * local igual; así una cancelación hecha desde MP no deja el estado colgado.
   * Un fallo transitorio (5xx/red) sí se propaga para poder reintentar.
   */
  async cancelarParaNegocio(negocioId: string, preapprovalId: string): Promise<void>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    try
    {
      await cancelarPreapproval(preapprovalId, platformToken);
    }
    catch (error)
    {
      if (!esSuscripcionYaCancelada(error))
      {
        throw error;
      }
    }

    await this.cancelarSuscripcionLocal(negocioId);
  }

  /**
   * Resuelve el negocio dueño de un cobro recurrente.
   *
   * El `data.id` del tópico `subscription_authorized_payment` es un pago
   * autorizado (cuota). Se consulta con `GET /authorized_payments/{id}`, que
   * ya trae `external_reference` (negocio) y `preapproval_id`, así que el
   * mapeo no depende del email del pagador. El email queda como respaldo
   * para cuotas sin `external_reference`. Null si ningún eslabón resuelve.
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
      const status = normalizarEstadoCobro(cobro.status, cobro.paymentStatus);

      if (cobro.externalReference !== null && cobro.preapprovalId !== null)
      {
        return {
          negocioId: cobro.externalReference,
          preapprovalId: cobro.preapprovalId,
          status,
        };
      }

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
        preapprovalId: cobro.preapprovalId ?? preapproval.id,
        status,
      };
    }
    catch
    {
      return null;
    }
  }
}

/**
 * Indica si el rechazo de MP corresponde a una suscripción ya cancelada.
 *
 * MercadoPago devuelve 400 al cancelar un preapproval ya cancelado y 404
 * cuando el recurso no existe para el token; en ambos casos no queda nada por
 * cancelar y corresponde limpiar el plan local.
 *
 * @param error Error capturado al intentar cancelar en MP.
 * @return `true` cuando la suscripción ya no está activa en MP.
 */
function esSuscripcionYaCancelada(error: unknown): boolean
{
  return error instanceof MpHttpError && (error.status === 400 || error.status === 404);
}

/**
 * Normaliza el estado de un cobro recurrente.
 *
 * Prioriza el estado del pago real (`approved`/`rejected`…) cuando existe;
 * si no, traduce el estado de la cuota (`recycling` → mora).
 *
 * @param estadoCuota Estado de la cuota autorizada (`processed`, `recycling`…).
 * @param estadoPago Estado del pago asociado, si MP lo expone.
 * @return Estado normalizado para decidir activación o mora.
 */
function normalizarEstadoCobro(estadoCuota: string, estadoPago: string | null): string
{
  if (estadoPago !== null)
  {
    return estadoPago;
  }

  if (estadoCuota === "recycling")
  {
    return "rejected";
  }

  if (estadoCuota === "canceled")
  {
    return "cancelled";
  }

  return estadoCuota;
}

export const subscriptionService = new SubscriptionService();
