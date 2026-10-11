import Link from "next/link";

import { activarPlan, cancelarPlan } from "./actions";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { diasTrialRestantes, GRACIA_PAST_DUE_DIAS } from "@/lib/onboarding/trial";
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
    suscripcion_estado?: unknown;
    suscripcion_mp_id?: unknown;
    suscripcion_mora_desde?: unknown;
  };
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

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Facturación</h1>
            <p className="text-slate-600 mt-2">Plan mensual de TurnoMas: $ 14.999 ARS/mes.</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Volver
          </Link>
        </div>

        {params?.suscripcion === "ok" && (
          <p className="text-xs font-semibold px-3 py-2 rounded-lg border mb-4
            bg-green-50 text-green-700 border-green-200">
            Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Plan mensual</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border
              bg-slate-100 text-slate-500 border-slate-200">
              {estado === "active" ? "Activo"
                : estado === "past_due" ? `En mora (${GRACIA_PAST_DUE_DIAS} días de gracia)`
                : estado === "blocked" ? "Bloqueado"
                : diasRestantes !== null ? `Prueba: ${diasRestantes} días restantes` : "Prueba"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {estado === "active"
              ? "Tu plan está activo. El débito es automático cada mes."
              : estado === "past_due"
              ? "Falló el último cobro. Regularizá tu tarjeta antes de que termine la gracia o se bloquea el acceso."
              : estado === "blocked"
              ? "Tu acceso está bloqueado por falta de pago. Activá el plan para continuar."
              : "Tenés 14 días gratis. Activá el plan para no interrumpir tu agenda."}
          </p>
          {demo ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              La demo no suscribe planes reales. Creá tu cuenta gratis para activar el tuyo.
            </p>
          ) : estado === "active" ? (
            <form action={cancelarPlan}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                  text-slate-600 hover:bg-slate-50 transition-colors"
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
                Activar plan $ 14.999/mes
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
