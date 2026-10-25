import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { cancelarPlan as cancelarPlanAction } from "./actions";
import type { ActionResult } from "@/lib/actions/action-result";
import { runAction } from "@/lib/actions/run-action";
import ActionForm from "@/components/ui/action-form";
import SubmitButton from "@/components/ui/submit-button";
import CopiarComprobante from "@/components/copiar-comprobante";
import SuscripcionForm from "@/components/suscripcion-form";
import VerificarPago from "@/components/verificar-pago";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { diasSuscripcionRestantes, diasTrialRestantes } from "@/lib/onboarding/trial";
import { esRetornoCheckout } from "@/lib/payments/checkout-return";
import { calcularPrecioConPromo } from "@/lib/payments/promocion";
import { resolverPlanPais } from "@/lib/payments/subscription";
import { promocionService, type Promocion } from "@/lib/services/promociones";
import { subscriptionService, type PagoSuscripcion } from "@/lib/services/subscription";
import { formatearEnZonaConFecha, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

/** Formatea un monto en centavos según su moneda (ARS/USD). */
function formatearMonto(currency: string, cents: number): string
{
  try
  {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }
  catch
  {
    return `${cents / 100} ${currency}`;
  }
}

/**
 * Formatea un precio del plan (unidades de moneda, no centavos).
 *
 * @param currency Moneda ISO.
 * @param monto Monto mensual.
 * @return Precio legible.
 */
function formatearPrecioPlan(currency: string, monto: number): string
{
  try
  {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(monto);
  }
  catch
  {
    return `${monto} ${currency}`;
  }
}

/**
 * Carga la promo vigente sin romper la página si la migración no está aplicada.
 *
 * @param negocioId ID del negocio.
 * @return Promo vigente o null.
 */
async function cargarPromo(negocioId: string): Promise<Promocion | null>
{
  try
  {
    return await promocionService.obtenerVigente(negocioId);
  }
  catch
  {
    return null;
  }
}

/** Etiqueta legible del estado de una cuota del plan. */
function etiquetaPago(estado: string): string
{
  if (estado === "approved")
  {
    return "Pagado";
  }

  if (estado === "rejected")
  {
    return "Rechazado";
  }

  if (estado === "pending" || estado === "scheduled")
  {
    return "Pendiente";
  }

  return estado;
}

/** Clases del badge según el estado de la cuota. */
function clasePago(estado: string): string
{
  if (estado === "approved")
  {
    return "bg-emerald-500/10 text-[#0c6b45] border-emerald-500/30";
  }

  if (estado === "rejected")
  {
    return "ui-badge-danger";
  }

  return "ui-badge-warning";
}

/**
 * Historial de pagos del negocio (best-effort: nunca rompe la página).
 *
 * @param negocioId ID del negocio o null (sin fila).
 * @return Cuotas ordenadas por fecha desc, o lista vacía si falla.
 */
async function cargarPagos(negocioId: string | null): Promise<PagoSuscripcion[]>
{
  if (negocioId === null)
  {
    return [];
  }

  try
  {
    return await subscriptionService.listarPagos(negocioId);
  }
  catch
  {
    return [];
  }
}


/**
 * Reconcilia la suscripción contra MercadoPago al volver del checkout.
 *
 * Best-effort: si MP no responde o falta configuración, la página se renderiza
 * igual y queda el fallback cliente (`VerificarPago`) con el botón manual.
 *
 * @param negocio Fila del negocio (se usa su `id`).
 */
async function reconciliarRetorno(negocio: { id?: unknown }): Promise<void>
{
  const negocioId = typeof negocio.id === "string" ? negocio.id : "";

  if (negocioId.length === 0)
  {
    return;
  }

  try
  {
    await subscriptionService.reconciliar(negocioId);
  }
  catch
  {
    // Best-effort: el retorno del checkout nunca debe romper la página.
  }
}

interface NegocioSuscripcion
{
  readonly id?: unknown;
  readonly created_at?: unknown;
  readonly pais?: unknown;
  readonly timezone?: unknown;
  readonly suscripcion_estado?: unknown;
  readonly suscripcion_mp_id?: unknown;
  readonly suscripcion_mora_desde?: unknown;
  readonly suscripcion_vence_en?: unknown;
  readonly suscripcion_cancelada_en?: unknown;
  readonly suscripcion_mp_status?: unknown;
}

interface ContextoPlan
{
  readonly plan: ReturnType<typeof resolverPlanPais>;
  readonly estado: ReturnType<typeof getNegocioSubscriptionStatus>;
  readonly venceEn: string | null;
  readonly diasRestantes: number | null;
  readonly diasPlan: number | null;
  readonly planCancelado: boolean;
  readonly negocioId: string | null;
  readonly timeZone: ReturnType<typeof resolverTimezoneNegocio>;
}

/** Devuelve el valor si es string, o null. */
function textoONull(valor: unknown): string | null
{
  return typeof valor === "string" ? valor : null;
}

/**
 * Normaliza la fila del negocio en el contexto de suscripción plano.
 *
 * @param negocio Fila cruda del negocio.
 * @return Plan, estado, vencimientos y zona horaria resueltos.
 */
function contextoPlan(negocio: NegocioSuscripcion): ContextoPlan
{
  const creado = textoONull(negocio.created_at);
  const venceEn = textoONull(negocio.suscripcion_vence_en);
  const canceladaEn = textoONull(negocio.suscripcion_cancelada_en);
  const estado = getNegocioSubscriptionStatus({
    created_at: creado,
    suscripcion_estado: textoONull(negocio.suscripcion_estado),
    suscripcion_mp_id: textoONull(negocio.suscripcion_mp_id),
    suscripcion_mora_desde: textoONull(negocio.suscripcion_mora_desde),
    suscripcion_vence_en: venceEn,
    suscripcion_cancelada_en: canceladaEn,
    suscripcion_mp_status: textoONull(negocio.suscripcion_mp_status),
  });

  return {
    plan: resolverPlanPais(textoONull(negocio.pais)),
    estado,
    venceEn,
    diasRestantes: diasTrialRestantes(creado),
    diasPlan: diasSuscripcionRestantes(venceEn),
    planCancelado: estado === "active" && canceladaEn !== null,
    negocioId: typeof negocio.id === "string" && negocio.id.length > 0 ? negocio.id : null,
    timeZone: resolverTimezoneNegocio({ timezone: negocio.timezone, pais: negocio.pais }),
  };
}

/** Etiqueta corta del badge de estado del plan. */
function etiquetaEstado(estado: string, planCancelado: boolean, diasRestantes: number | null): string
{
  if (estado === "active")
  {
    return planCancelado ? "Cancelado" : "Activo";
  }

  if (estado === "past_due")
  {
    return "En mora";
  }

  if (estado === "blocked")
  {
    return "Bloqueado";
  }

  return diasRestantes !== null ? `Prueba: ${diasRestantes} días restantes` : "Prueba";
}

/** Descripción larga del estado del plan. */
function descripcionEstado(
  estado: string,
  planCancelado: boolean,
  venceEn: string | null,
  diasPlan: number | null,
  timeZone: string,
): string
{
  if (estado === "past_due")
  {
    return "Falló el último cobro. Regularizá tu tarjeta antes de que termine la gracia o se bloquea el acceso.";
  }

  if (estado === "blocked")
  {
    return "Tu acceso está bloqueado por falta de pago. Activá el plan para continuar.";
  }

  if (estado !== "active")
  {
    return "Tenés 14 días gratis. Activá el plan para no interrumpir tu agenda.";
  }

  if (!planCancelado)
  {
    return "Tu plan está activo. El débito es automático cada mes."
      + (diasPlan !== null ? ` Se renueva en ${diasPlan} días.` : "");
  }

  if (venceEn === null)
  {
    return "Cancelaste el plan. Conservás el acceso hasta que termine el período ya pago.";
  }

  return "Cancelaste el plan. Seguís con acceso hasta el "
    + `${formatearEnZonaConFecha(venceEn, timeZone)}`
    + (diasPlan !== null ? ` (${diasPlan} días restantes).` : ".");
}


async function cancelarPlan(): Promise<ActionResult<void>>
{
  "use server";

  return runAction("cancelarPlan", async () =>
  {
    await cancelarPlanAction();
  });
}

interface PanelAccionProps
{
  readonly estado: string;
  readonly planCancelado: boolean;
  readonly userEmail: string | null;
}

/** Acción principal del plan (cancelar, reactivar o suscribir). */
function panelAccionSuscripcion(props: PanelAccionProps): ReactNode
{
  if (props.estado === "active" && !props.planCancelado)
  {
    return (
      <ActionForm action={cancelarPlan} successMessage="Plan cancelado.">
        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
          Cancelar plan
        </SubmitButton>
      </ActionForm>
    );
  }

  if (props.estado === "blocked")
  {
    return (
      <p className="text-xs text-muted-foreground bg-surface border border-line rounded-lg p-3">
        Completá el pago en el aviso para reactivar tu plan.
      </p>
    );
  }

  return (
    <div>
      {props.planCancelado && (
        <p className="text-xs text-muted-foreground mb-3">
          Reactivá tu plan para volver a renovar automáticamente cada mes.
        </p>
      )}
      <SuscripcionForm idPrefix="suscripcion" emailInicial={props.userEmail ?? undefined} />
    </div>
  );
}

export default async function SuscripcionPage(
  props?: { readonly searchParams?: Promise<{ suscripcion?: string; preapproval_id?: string; error?: string }> },
)
{
  const inicial = await getDashboardData();
  const params = props?.searchParams === undefined ? undefined : await props.searchParams;
  const retorno = esRetornoCheckout({
    suscripcion: params?.suscripcion,
    preapproval_id: params?.preapproval_id,
  });

  let dashboard = inicial.data;
  let userEmail = inicial.userEmail;

  if (retorno)
  {
    await reconciliarRetorno(dashboard.negocio as { id?: unknown });
    const refrescado = await getDashboardData();

    dashboard = refrescado.data;
    userEmail = refrescado.userEmail;
  }

  const ctx = contextoPlan(dashboard.negocio as NegocioSuscripcion);
  const promo = ctx.negocioId === null ? null : await cargarPromo(ctx.negocioId);
  const precioPlan = calcularPrecioConPromo(ctx.plan.monto, promo);
  const pagos = await cargarPagos(ctx.negocioId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ui-page-title">Suscripción</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {precioPlan.aplicada && promo !== null ? (
              <>
                Plan mensual:{" "}
                <span className="line-through text-muted-foreground">
                  {formatearPrecioPlan(ctx.plan.currency, ctx.plan.monto)}
                </span>{" "}
                <span className="font-semibold text-[#0c6b45]">
                  {formatearPrecioPlan(ctx.plan.currency, precioPlan.montoFinal)}
                </span>
                {` · ${precioPlan.porcentaje}% off hasta `}
                {new Date(promo.vigenteHasta).toLocaleDateString("es-AR", {
                  timeZone: ctx.timeZone,
                })}.
              </>
            ) : (
              <>Plan mensual de TurnoMas: {ctx.plan.etiqueta}.</>
            )}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="ui-btn ui-btn-outline ui-btn-sm"
        >
          Volver
        </Link>
      </div>

      {retorno && ctx.estado !== "active" && (
        <p className="ui-alert ui-alert-success mb-4 text-xs font-semibold">
          Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.
        </p>
      )}

      {params?.error !== undefined && params.error.length > 0 && (
        <p className="ui-alert ui-alert-danger mb-4 text-xs font-semibold">
          {`No pudimos iniciar la activación: ${params.error}`}
        </p>
      )}

      {ctx.estado === "active" && !ctx.planCancelado && ctx.venceEn !== null && ctx.diasPlan === 0 && (
        <p className="ui-alert ui-alert-warning mb-4 text-xs font-semibold">
          Estamos confirmando la renovación de tu plan con MercadoPago. Conservás el acceso mientras tanto.
        </p>
      )}

      <div className="ui-card mb-4 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="ui-section-title">Plan mensual</h3>
            <span className="ui-badge ui-badge-neutral">
              {etiquetaEstado(ctx.estado, ctx.planCancelado, ctx.diasRestantes)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {descripcionEstado(ctx.estado, ctx.planCancelado, ctx.venceEn, ctx.diasPlan, ctx.timeZone)}
          </p>
          {promo !== null && promo.ultimoError !== null && (
            <p className="ui-alert ui-alert-warning mb-4 text-xs font-semibold">
              Estamos terminando de aplicar tu descuento en MercadoPago. Si el próximo cobro sale con el
              precio de lista, escribinos y lo corregimos.
            </p>
          )}
          {panelAccionSuscripcion({
            estado: ctx.estado,
            planCancelado: ctx.planCancelado,
            userEmail,
          })}
        </div>

      <div className="ui-card mb-4 p-4 sm:p-6">
        <h3 className="ui-section-title mb-4">Historial de pagos</h3>
        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-th">Fecha</th>
                  <th className="ui-th">Monto</th>
                  <th className="ui-th">Estado</th>
                  <th className="ui-th">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagos.map((pago) => (
                  <tr key={pago.id} className="ui-tr">
                    <td className="ui-td whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatearEnZonaConFecha(pago.fecha, ctx.timeZone)}
                    </td>
                    <td className="ui-td whitespace-nowrap text-ink tabular-nums">
                      {formatearMonto(pago.currency, pago.montoCents)}
                    </td>
                    <td className="ui-td">
                      <span className={`ui-badge ${clasePago(pago.estado)}`}>
                        {etiquetaPago(pago.estado)}
                      </span>
                    </td>
                    <td className="ui-td text-muted-foreground">
                      <CopiarComprobante comprobanteId={pago.mpPaymentId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {retorno && ctx.estado !== "active" && ctx.estado !== "blocked" ? (
        <Suspense fallback={null}>
          <VerificarPago />
        </Suspense>
      ) : null}
    </div>
  );
}
