import { Suspense } from "react";
import Link from "next/link";

import { cancelarPlan } from "./actions";
import CopiarComprobante from "@/components/copiar-comprobante";
import SuscripcionForm from "@/components/suscripcion-form";
import VerificarPago from "@/components/verificar-pago";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { diasTrialRestantes, GRACIA_PAST_DUE_DIAS } from "@/lib/onboarding/trial";
import { esRetornoCheckout } from "@/lib/payments/checkout-return";
import { resolverPlanPais } from "@/lib/payments/subscription";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Indica si el lector es el dueño demo (sin suscripciones reales). */
async function esDuenoDemo(): Promise<boolean>
{
  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return user !== null && isDemoOwner({ userId: user.id, email: user.email ?? null });
  }
  catch
  {
    return false;
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

export default async function FacturacionPage(
  props?: { readonly searchParams?: Promise<{ suscripcion?: string; preapproval_id?: string; error?: string }> },
)
{
  const params = props?.searchParams === undefined ? undefined : await props.searchParams;
  const demo = await esDuenoDemo();
  const retorno = esRetornoCheckout({
    suscripcion: params?.suscripcion,
    preapproval_id: params?.preapproval_id,
  });

  const inicial = await getDashboardData();
  let dashboard = inicial.data;
  let userEmail = inicial.userEmail;

  if (retorno && !demo)
  {
    await reconciliarRetorno(dashboard.negocio as { id?: unknown });
    const refrescado = await getDashboardData();

    dashboard = refrescado.data;
    userEmail = refrescado.userEmail;
  }

  const negocio = dashboard.negocio as {
    created_at?: unknown;
    pais?: unknown;
    suscripcion_estado?: unknown;
    suscripcion_mp_id?: unknown;
    suscripcion_mora_desde?: unknown;
  };
  const plan = resolverPlanPais(typeof negocio.pais === "string" ? negocio.pais : null);
  const creado = typeof negocio.created_at === "string" ? negocio.created_at : null;
  const estado = getNegocioSubscriptionStatus({
    created_at: creado,
    suscripcion_estado:
      typeof negocio.suscripcion_estado === "string" ? negocio.suscripcion_estado : null,
    suscripcion_mp_id:
      typeof negocio.suscripcion_mp_id === "string" ? negocio.suscripcion_mp_id : null,
    suscripcion_mora_desde:
      typeof negocio.suscripcion_mora_desde === "string" ? negocio.suscripcion_mora_desde : null,
  });
  const diasRestantes = diasTrialRestantes(creado);
  const suscripcionId = typeof negocio.suscripcion_mp_id === "string"
    && negocio.suscripcion_mp_id.trim().length > 0
    ? negocio.suscripcion_mp_id.trim()
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Facturación</h1>
          <p className="text-slate-400 mt-1 text-sm">Plan mensual de TurnoMas: {plan.etiqueta}.</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 border border-white/15 rounded-xl text-slate-300 hover:bg-white/10"
        >
          Volver
        </Link>
      </div>

      {retorno && estado !== "active" && (
        <p className="text-xs font-semibold px-3 py-2 rounded-lg border mb-4
          bg-green-500/10 text-green-300 border-green-500/30">
          Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.
        </p>
      )}

      {params?.error !== undefined && params.error.length > 0 && (
        <p className="text-xs font-semibold px-3 py-2 rounded-lg border mb-4
          bg-rose-500/10 text-rose-300 border-rose-500/30">
          {`No pudimos iniciar la activación: ${params.error}`}
        </p>
      )}

      <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100">Plan mensual</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border
              bg-white/10 text-slate-400 border-white/10">
              {estado === "active" ? "Activo"
                : estado === "past_due" ? `En mora (${GRACIA_PAST_DUE_DIAS} días de gracia)`
                : estado === "blocked" ? "Bloqueado"
                : diasRestantes !== null ? `Prueba: ${diasRestantes} días restantes` : "Prueba"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {estado === "active"
              ? "Tu plan está activo. El débito es automático cada mes."
              : estado === "past_due"
              ? "Falló el último cobro. Regularizá tu tarjeta antes de que termine la gracia o se bloquea el acceso."
              : estado === "blocked"
              ? "Tu acceso está bloqueado por falta de pago. Activá el plan para continuar."
              : "Tenés 14 días gratis. Activá el plan para no interrumpir tu agenda."}
          </p>
          {demo ? (
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg p-3">
              La demo no suscribe planes reales. Creá tu cuenta gratis para activar el tuyo.
            </p>
          ) : estado === "active" ? (
            <form action={cancelarPlan}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                  text-slate-400 hover:bg-white/10 transition-colors"
              >
                Cancelar plan
              </button>
            </form>
          ) : estado === "blocked" ? (
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg p-3">
              Completá el pago en el aviso para reactivar tu plan.
            </p>
          ) : (
            <SuscripcionForm idPrefix="facturacion" emailInicial={userEmail ?? undefined} />
          )}
          {suscripcionId !== null && !demo ? (
            <p className="text-xs text-slate-400 mt-4">
              Comprobante: <CopiarComprobante comprobanteId={suscripcionId} />
            </p>
          ) : null}
        </div>

      {retorno && !demo && estado !== "active" && estado !== "blocked" ? (
        <Suspense fallback={null}>
          <VerificarPago />
        </Suspense>
      ) : null}
    </div>
  );
}
