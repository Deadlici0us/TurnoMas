import Link from "next/link";

import LeyendaEstados from "@/components/leyenda-estados";
import { getDashboardData } from "@/lib/dashboard/queries";
import { claseBadgePara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";

interface TurnoRow
{
  readonly id: string;
  readonly cliente_id: string;
  readonly servicio_id: string;
  readonly inicio: string;
  readonly estado: "pendiente" | "confirmado" | "pagado" | "completado" | "cancelado" | "ausente";
  readonly monto_total: number | null;
  readonly sena_monto: number | null;
}

function formatARS(cents: number | null): string
{
  if (cents === null)
  {
    return "—";
  }

  return new Intl.NumberFormat("es-AR",
    { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cents / 100);
}

export default async function PagosPage()
{
  const { data: dashboard } = await getDashboardData();
  const turnos = (dashboard.turnos as TurnoRow[]).slice()
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  const nombrePorServicio = new Map((dashboard.servicios as Array<{ id: string; nombre: string }>)
    .map((s) => [s.id, s.nombre]));
  const nombrePorCliente = new Map((dashboard.clientes as Array<{ id: string; nombre: string }>)
    .map((c) => [c.id, c.nombre]));
  const totalPendiente = turnos
    .filter((t) => t.estado === "pendiente" || t.estado === "confirmado")
    .reduce((acum, t) => acum + (t.estado === "confirmado"
      ? (t.monto_total ?? 0)
      : ((t.monto_total ?? 0) - (t.sena_monto ?? 0))), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Pagos</h1>
              <p className="text-sm text-slate-600">Seguimiento financiero de señas</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Pendiente cobrar</div>
              <div className="text-2xl font-bold text-blue-600">{formatARS(totalPendiente)}</div>
            </div>
          </div>
          <div className="mb-4"><LeyendaEstados /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Servicio</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold">Seña</th>
                  <th className="pb-3 font-semibold">Saldo</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {turnos.map((turno) => (
                  <tr key={turno.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">
                      {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                    </td>
                    <td className="py-3 text-slate-600">
                      {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                    </td>
                    <td className="py-3 text-slate-600">{formatARS(turno.monto_total)}</td>
                    <td className="py-3 text-slate-600">{formatARS(turno.sena_monto)}</td>
                    <td className="py-3 text-slate-600">{formatARS((turno.monto_total ?? 0) - (turno.sena_monto ?? 0))}</td>
                    <td className="py-3">
                      <span className={"px-2 py-0.5 text-xs rounded-full font-semibold border "
                        + claseBadgePara(turno.estado)}>
                        {etiquetaEstadoPara(turno.estado)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(turno.inicio).toLocaleDateString("es-AR",
                        { day: "2-digit", month: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {turnos.length === 0 ? <p className="text-sm text-slate-500 mt-4">Todavía no hay movimientos.</p> : null}
        </div>
      </div>
    </div>
  );
}
