import Link from "next/link";

import { activarPlan, cancelarPlan } from "./actions";
import CopiarComprobante from "@/components/copiar-comprobante";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { diasTrialRestantes, GRACIA_PAST_DUE_DIAS } from "@/lib/onboarding/trial";
import { resolverPlanPais } from "@/lib/payments/subscription";
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

export default async function FacturacionPage(
  props?: { readonly searchParams?: Promise<{ suscripcion?: string }> },
)
{
  const { data: dashboard } = await getDashboardData();
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
  const demo = await esDuenoDemo();
  const params = props?.searchParams === undefined ? undefined : await props.searchParams;
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

      {params?.suscripcion === "ok" && (
        <p className="text-xs font-semibold px-3 py-2 rounded-lg border mb-4
          bg-green-500/10 text-green-300 border-green-500/30">
          Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.
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
          ) : (
            <form action={activarPlan}>
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                  hover:bg-blue-700 transition-colors"
              >
                Activar plan {plan.etiqueta}
              </button>
            </form>
          )}
          {suscripcionId !== null && !demo ? (
            <p className="text-xs text-slate-400 mt-4">
              Comprobante: <CopiarComprobante comprobanteId={suscripcionId} />
            </p>
          ) : null}
        </div>
    </div>
  );
}
