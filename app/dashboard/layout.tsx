import { getDashboardData } from "@/lib/dashboard/queries";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DemoEditableBanner from "@/components/demo-editable-banner";
import PaywallPlanVencido from "@/components/paywall-plan-vencido";
import { activarPlan } from "@/app/dashboard/facturacion/actions";
import { logout } from "@/app/login/actions";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { resolverPlanPais } from "@/lib/payments/subscription";

/** Shell del dashboard: banner demo, navegación lateral y paywall si venció el plan. */
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
})
{
  const { data: dashboard, isDemo } = await getDashboardData();
  const candidatos = candidatosDesdeDashboard(dashboard);
  const negocio = dashboard.negocio as {
    created_at?: unknown;
    pais?: unknown;
    suscripcion_estado?: unknown;
    suscripcion_mp_id?: unknown;
    suscripcion_mora_desde?: unknown;
  };
  const bloqueado = getNegocioSubscriptionStatus({
    created_at: typeof negocio.created_at === "string" ? negocio.created_at : null,
    suscripcion_estado:
      typeof negocio.suscripcion_estado === "string" ? negocio.suscripcion_estado : null,
    suscripcion_mp_id:
      typeof negocio.suscripcion_mp_id === "string" ? negocio.suscripcion_mp_id : null,
    suscripcion_mora_desde:
      typeof negocio.suscripcion_mora_desde === "string" ? negocio.suscripcion_mora_desde : null,
  }) === "blocked";
  const plan = resolverPlanPais(typeof negocio.pais === "string" ? negocio.pais : null);

  return (
    <>
      <div className="relative z-10 flex min-h-screen bg-slate-950 text-slate-100 scheme-dark">
        <DashboardSidebar pendientesRemarketing={candidatos.length} bloqueado={bloqueado} />
        <div className="min-w-0 flex-1">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {isDemo ? <DemoEditableBanner /> : null}
            <main>{children}</main>
          </div>
        </div>
      </div>
      {bloqueado ? (
        <PaywallPlanVencido etiquetaPlan={plan.etiqueta} activar={activarPlan} logout={logout} />
      ) : null}
    </>
  );
}