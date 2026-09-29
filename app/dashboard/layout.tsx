import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";
import DemoEditableBanner from "@/components/demo-editable-banner";

/**
 * Shell del dashboard: banner demo + navegación única.
 *
 * @param props children de cada sección.
 * @return Contenedor con nav compartida.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
})
{
  const { isDemo } = await getDashboardData();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {isDemo ? <DemoEditableBanner /> : null}
        <nav aria-label="Secciones del panel" className="flex flex-wrap gap-2 sm:gap-3 mb-8">
          <Link href="/dashboard" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Panel
          </Link>
          <Link href="/dashboard/agenda" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Agenda
          </Link>
          <Link href="/dashboard/staff" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Equipo
          </Link>
          <Link href="/dashboard/servicios" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Servicios
          </Link>
          <Link href="/dashboard/clientes" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Clientes
          </Link>
          <Link href="/dashboard/pagos" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Pagos
          </Link>
          <Link href="/dashboard/config" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold">
            Configuración
          </Link>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
