import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getDashboardData, getDashboardStats } from "@/lib/dashboard/queries";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  pagado: "bg-green-50 text-green-700",
  completado: "bg-blue-50 text-blue-700",
  ausente: "bg-red-50 text-red-700",
  cancelado: "bg-slate-100 text-slate-600",
};

function formatARS(centavos: number | null): string
{
  return `$ ${(centavos ?? 0).toLocaleString("es-AR")}`;
}

export default async function DashboardPage()
{
  const t = await getTranslations("common");
  const { data: dashboard } = await getDashboardData();

  const negocioRow = dashboard.negocio as {
    id?: unknown;
    nombre?: unknown;
    created_at?: unknown;
    suscripcion_estado?: unknown;
    suscripcion_mp_id?: unknown;
  };

  const subscription = getNegocioSubscriptionStatus({
    created_at: typeof negocioRow.created_at === "string" ? negocioRow.created_at : null,
    suscripcion_estado:
      typeof negocioRow.suscripcion_estado === "string" ? negocioRow.suscripcion_estado : null,
    suscripcion_mp_id:
      typeof negocioRow.suscripcion_mp_id === "string" ? negocioRow.suscripcion_mp_id : null,
  });

  if (subscription === "blocked")
  {
    redirect("/pricing?blocked=1");
  }

  const stats = await getDashboardStats(String(dashboard.negocio.id ?? ""));

  const nombrePorServicio = new Map<string, string>(
    dashboard.servicios.map((s: { id: string; nombre: string }) => [s.id, s.nombre]),
  );
  const nombrePorCliente = new Map<string, string>(
    dashboard.clientes.map((c: { id: string; nombre: string }) => [c.id, c.nombre]),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {String(dashboard.negocio.nombre ?? t("appName"))}
        </h1>
        <p className="text-slate-600 mt-1 text-sm">Agenda, equipo, servicios y cobros en un solo lugar.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Turnos hoy</p>
          <p className="text-2xl font-bold text-slate-900">{stats.turnosHoy}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Pendientes</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pendientes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Pagados</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pagados}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Ingresos</p>
          <p className="text-2xl font-bold text-slate-900">{formatARS(stats.totalIngresos)}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.turnos.map((turno: {
                id: string;
                estado: string;
                servicio_id: string;
                cliente_id: string;
                monto_total: number | null;
              }) => (
                <tr key={turno.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[turno.estado] ?? ESTADO_COLOR.cancelado}`}>
                      {turno.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {formatARS(turno.monto_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
