import { readEnv } from "@/lib/env/env";
import {
  MpHttpError,
  buscarPreapprovalPorEmail,
  buscarPreapprovalsPorEstado,
  cancelarPreapproval,
  consultarCobroSuscripcion,
  consultarPreapproval,
  crearPreapproval,
  primerVencimiento,
  resolverPlanPais,
  type PreapprovalResumen,
} from "@/lib/payments/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

import { promocionService } from "./promociones";

/** Cuota persistida del plan SaaS (historial de pagos). */
export interface PagoSuscripcion
{
  readonly id: string;
  readonly preapprovalId: string;
  readonly authorizedPaymentId: string;
  readonly mpPaymentId: string | null;
  readonly montoCents: number;
  readonly currency: string;
  readonly estado: string;
  readonly fecha: string;
}

/** Datos de una cuota a persistir en el historial. */
export interface RegistrarPagoInput
{
  readonly negocioId: string;
  readonly preapprovalId: string;
  readonly authorizedPaymentId: string;
  readonly mpPaymentId: string | null;
  readonly montoCents: number;
  readonly currency: string;
  readonly estado: string;
  readonly fecha: string;
}

/** Vínculo de un cobro recurrente con su negocio y datos de la cuota. */
export interface VinculoCobro
{
  readonly negocioId: string;
  readonly preapprovalId: string;
  readonly status: string;
  readonly authorizedPaymentId: string;
  readonly mpPaymentId: string | null;
  readonly montoCents: number | null;
  readonly currency: string | null;
  readonly fecha: string | null;
}

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
    const { precio } = await promocionService.precioParaNegocio(negocioId, plan.monto);

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
      backUrl: `${stripTrailingSlashes(base)}/dashboard/suscripcion?suscripcion=ok`,
      notificationUrl: `${stripTrailingSlashes(base)}/api/webhooks/mercadopago`,
      monto: precio.montoFinal,
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
      // El `preapproval/search` a veces omite `next_payment_date`; el GET
      // individual sí lo expone. Sin fecha, se cae a +1 mes para no arrastrar
      // un vencimiento viejo que dejaría la suscripción "vencida".
      const vence = elegida.nextPaymentDate
        ?? (await consultarPreapproval(elegida.id, platformToken)).nextPaymentDate;
      await this.activarSuscripcion(negocioId, elegida.id, vence);

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

  /**
   * Activa/renueva el plan del negocio con el ID del preapproval autorizado.
   *
   * Siempre deja el período vigente: si MP no informa `venceEn`, calcula un mes
   * desde `desde`. Marca el espejo `suscripcion_mp_status = "authorized"` y la
   * verificación, para que el gate no bloquee mientras MP renueva.
   *
   * @param negocioId Negocio dueño del plan.
   * @param preapprovalId Suscripción autorizada en MP.
   * @param venceEn Fin del período pago (ISO 8601) o null para calcular +1 mes.
   * @param desde Momento de la activación/verificación.
   */
  async activarSuscripcion(
    negocioId: string,
    preapprovalId: string,
    venceEn: string | null = null,
    desde: Date = new Date(),
  ): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_estado: "active",
      suscripcion_mp_id: preapprovalId,
      suscripcion_mora_desde: null,
      suscripcion_cancelada_en: null,
      suscripcion_vence_en: venceEn ?? primerVencimiento(desde.toISOString()),
      suscripcion_mp_status: "authorized",
      suscripcion_verificada_en: desde.toISOString(),
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

  /**
   * Marca la suscripción como cancelada sin cortar el acceso.
   *
   * El gate conserva el plan `active` hasta `suscripcion_vence_en` (fin del
   * período pago) y recién ahí bloquea. Idempotente: reintentar la cancelación
   * sólo refresca la marca y el vencimiento.
   *
   * @param negocioId Negocio dueño del plan.
   * @param venceEn Fin del período pago (ISO 8601) o null para conservar el previo.
   * @param desde Marca temporal de la cancelación.
   */
  async marcarCancelada(
    negocioId: string,
    venceEn: string | null,
    desde: Date = new Date(),
  ): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const cambios: Record<string, unknown> = {
      suscripcion_estado: "active",
      suscripcion_cancelada_en: desde.toISOString(),
      suscripcion_mp_status: "cancelled",
      suscripcion_verificada_en: desde.toISOString(),
    };

    if (venceEn !== null)
    {
      cambios.suscripcion_vence_en = venceEn;
    }

    const { error } = await admin.from("negocios").update(cambios).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos cancelar la suscripción. Probá de nuevo.");
    }
  }

  /** Bloquea el plan local (drift real de MP: ya no existe la suscripción). */
  async cancelarSuscripcionLocal(negocioId: string): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_estado: "blocked",
      suscripcion_mp_id: null,
      suscripcion_mora_desde: null,
      suscripcion_mp_status: null,
    }).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos cancelar la suscripción. Probá de nuevo.");
    }
  }

  /**
   * Registra el espejo del estado de MP tras una verificación que no autoriza.
   *
   * Se usa cuando MP informa `cancelled`/`paused`/`pending`: refresca
   * `suscripcion_mp_status` y `suscripcion_verificada_en` sin cortar el acceso
   * (el gate conserva la ventana paga hasta `suscripcion_vence_en` + margen).
   *
   * @param negocioId Negocio dueño del plan.
   * @param mpStatus Estado del preapproval en MercadoPago.
   * @param desde Momento de la verificación.
   */
  async marcarVerificado(
    negocioId: string,
    mpStatus: string,
    desde: Date = new Date(),
  ): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("negocios").update({
      suscripcion_mp_status: mpStatus,
      suscripcion_verificada_en: desde.toISOString(),
    }).eq("id", negocioId);

    if (error !== null)
    {
      throw new Error("No pudimos registrar la verificación. Probá de nuevo.");
    }
  }

  /**
   * Consulta el preapproval en MP y sincroniza el plan local.
   *
   * Si está `authorized`, activa/renueva (avanza el período y limpia mora y
   * cancelación). Si no, sólo refresca el espejo de estado. Devuelve el estado
   * para que el llamador decida (cron y rescate en línea del middleware).
   *
   * @param negocioId Negocio dueño del plan.
   * @param preapprovalId Suscripción a consultar.
   * @param desde Momento de la verificación.
   * @return Estado de MP, si quedó activa y su próximo vencimiento.
   */
  async verificarPreapproval(
    negocioId: string,
    preapprovalId: string,
    desde: Date = new Date(),
  ): Promise<{ readonly status: string; readonly activo: boolean; readonly nextPaymentDate: string | null }>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    const estado = await consultarPreapproval(preapprovalId, platformToken);

    if (estado.status === "authorized")
    {
      await this.activarSuscripcion(negocioId, preapprovalId, estado.nextPaymentDate, desde);

      return { status: estado.status, activo: true, nextPaymentDate: estado.nextPaymentDate };
    }

    await this.marcarVerificado(negocioId, estado.status, desde);

    return { status: estado.status, activo: false, nextPaymentDate: estado.nextPaymentDate };
  }

  /** Consulta un preapproval con el token de plataforma. */
  async consultarEstado(
    preapprovalId: string,
  ): Promise<{ status: string; externalReference: string | null; nextPaymentDate: string | null }>
  {
    const platformToken = readEnv("MP_ACCESS_TOKEN");

    if (platformToken === null)
    {
      throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
    }

    const estado = await consultarPreapproval(preapprovalId, platformToken);

    return {
      status: estado.status,
      externalReference: estado.externalReference,
      nextPaymentDate: estado.nextPaymentDate,
    };
  }

  /**
   * Cancela en MP y conserva el acceso local hasta el vencimiento (idempotente).
   *
   * Si MP rechaza porque el preapproval ya estaba cancelado (400) o no existe
   * para el token (404), el objetivo ya está cumplido y se marca la cancelación
   * igual; así una cancelación hecha desde MP no deja el estado colgado. Un
   * fallo transitorio (5xx/red) sí se propaga para poder reintentar.
   *
   * @param negocioId Negocio dueño del plan.
   * @param preapprovalId Suscripción de MercadoPago a cancelar.
   * @param venceEn Fin del período pago (ISO 8601) o null para conservar el previo.
   * @param desde Marca temporal de la cancelación.
   */
  async cancelarParaNegocio(
    negocioId: string,
    preapprovalId: string,
    venceEn: string | null = null,
    desde: Date = new Date(),
  ): Promise<void>
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

    await this.marcarCancelada(negocioId, venceEn, desde);
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
  async resolverNegocioDeCobro(paymentId: string): Promise<VinculoCobro | null>
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
      const cuota = {
        authorizedPaymentId: cobro.id,
        mpPaymentId: cobro.paymentId,
        montoCents: cobro.montoCents,
        currency: cobro.currency,
        fecha: cobro.fecha,
      };

      if (cobro.externalReference !== null && cobro.preapprovalId !== null)
      {
        return {
          negocioId: cobro.externalReference,
          preapprovalId: cobro.preapprovalId,
          status,
          ...cuota,
        };
      }

      if (cobro.payerEmail === null)
      {
        return null;
      }

      const preapproval = await buscarPreapprovalPorEmail(cobro.payerEmail, platformToken);

      if (!preapproval?.externalReference)
      {
        return null;
      }

      return {
        negocioId: preapproval.externalReference,
        preapprovalId: cobro.preapprovalId ?? preapproval.id,
        status,
        ...cuota,
      };
    }
    catch
    {
      return null;
    }
  }

  /**
   * Persiste una cuota del plan en el historial del negocio (idempotente).
   *
   * El `authorized_payment_id` es la clave de idempotencia: reintentos del
   * webhook de MercadoPago actualizan la misma fila en vez de duplicarla.
   *
   * @param input Datos de la cuota resueltos desde MercadoPago.
   * @throws Error cuando Supabase rechaza el upsert.
   */
  async registrarPago(input: RegistrarPagoInput): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("suscripcion_pagos").upsert({
      negocio_id: input.negocioId,
      preapproval_id: input.preapprovalId,
      authorized_payment_id: input.authorizedPaymentId,
      mp_payment_id: input.mpPaymentId,
      monto_cents: input.montoCents,
      currency: input.currency,
      estado: input.estado,
      fecha: input.fecha,
    }, { onConflict: "authorized_payment_id" });

    if (error !== null)
    {
      throw new Error("No pudimos registrar el pago de la suscripción. Probá de nuevo.");
    }
  }

  /** Lista las cuotas del negocio, más recientes primero. */
  async listarPagos(negocioId: string): Promise<PagoSuscripcion[]>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("suscripcion_pagos")
      .select("id, preapproval_id, authorized_payment_id, mp_payment_id, monto_cents, currency, estado, fecha")
      .eq("negocio_id", negocioId)
      .order("fecha", { ascending: false });

    if (error !== null)
    {
      throw new Error("No pudimos cargar el historial de pagos. Probá de nuevo.");
    }

    return (Array.isArray(data) ? data : []).flatMap((raw) =>
    {
      if (typeof raw !== "object" || raw === null)
      {
        return [];
      }

      const fila = raw as Record<string, unknown>;

      if (typeof fila.id !== "string" || typeof fila.fecha !== "string"
        || typeof fila.monto_cents !== "number" || typeof fila.currency !== "string"
        || typeof fila.estado !== "string" || typeof fila.preapproval_id !== "string"
        || typeof fila.authorized_payment_id !== "string")
      {
        return [];
      }

      return [{
        id: fila.id,
        preapprovalId: fila.preapproval_id,
        authorizedPaymentId: fila.authorized_payment_id,
        mpPaymentId: typeof fila.mp_payment_id === "string" ? fila.mp_payment_id : null,
        montoCents: fila.monto_cents,
        currency: fila.currency,
        estado: fila.estado,
        fecha: fila.fecha,
      }];
    });
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
