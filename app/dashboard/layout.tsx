import { getDashboardData } from "@/lib/dashboard/queries";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DemoEditableBanner from "@/components/demo-editable-banner";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";

/** Shell del dashboard: banner demo + navegación lateral. */
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
})
{
  const { data: dashboard, isDemo } = await getDashboardData();
  const candidatos = candidatosDesdeDashboard(dashboard);

  return (
    <div className="relative z-10 flex min-h-screen bg-slate-950 text-slate-100 scheme-dark">
      <DashboardSidebar pendientesRemarketing={candidatos.length} />
      <div className="min-w-0 flex-1">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {isDemo ? <DemoEditableBanner /> : null}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}