import Link from "next/link";

import { evaluateCustomer } from "@/lib/blacklist/blacklist";
import { getDashboardData } from "@/lib/dashboard/queries";

interface ClienteRow
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly ausencias: number;
  readonly bloqueado: boolean;
}

interface TurnoRow
{
  readonly id: string;
  readonly cliente_id: string;
  readonly servicio_id: string;
  readonly inicio: string;
  readonly estado: string;
}

export default async function ClientesPage()
{
  const { data: dashboard } = await getDashboardData();
  const clientes = dashboard.clientes as ClienteRow[];
  const turnos = dashboard.turnos as TurnoRow[];
  const umbral = typeof (dashboard.negocio as { blacklist_umbral?: number }).blacklist_umbral === "number"
    ? (dashboard.negocio as { blacklist_umbral: number }).blacklist_umbral
    : 2;
  const penalidad = (dashboard.negocio as { blacklist_penalidad?: "blocked" | "fullDeposit" })
    .blacklist_penalidad ?? "fullDeposit";
  const nombrePorServicio = new Map((dashboard.servicios as Array<{ id: string; nombre: string }>)
    .map((s) => [s.id, s.nombre]));
  const turnosPorCliente = new Map<string, TurnoRow[]>();

  for (const turno of turnos)
  {
    const lista = turnosPorCliente.get(turno.cliente_id) ?? [];
    lista.push(turno);
    turnosPorCliente.set(turno.cliente_id, lista);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Clientes</h1>
            <p className="text-sm text-slate-600">CRM local con ausencias y lista negra automática</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Contacto</th>
                  <th className="pb-3 font-semibold">Turnos</th>
                  <th className="pb-3 font-semibold">Ausencias</th>
                  <th className="pb-3 font-semibold">Último turno</th>
                  <th className="pb-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((cliente) =>
                {
                  const historial = (turnosPorCliente.get(cliente.id) ?? []).slice()
                    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
                  const ultimo = historial[0];
                  const decision = cliente.bloqueado
                    ? "blocked"
                    : evaluateCustomer(cliente.ausencias, { maxAllowedAbsences: umbral,
                      penaltyOnExceed: penalidad });
                  const enListaNegra = decision !== "allowed";

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900">{cliente.nombre}</td>
                      <td className="py-3 text-slate-600 text-xs">{cliente.whatsapp}</td>
                      <td className="py-3 text-slate-600">{historial.length}</td>
                      <td className="py-3">
                        <span className={cliente.ausencias >= umbral
                          ? "text-red-600 font-semibold"
                          : "text-slate-600"}>
                          {cliente.ausencias}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {ultimo
                          ? (nombrePorServicio.get(ultimo.servicio_id) ?? "Servicio") + " · " + ultimo.estado
                          : "Sin turnos"}
                      </td>
                      <td className="py-3">
                        {enListaNegra ? (
                          <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">
                            {decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {clientes.length === 0 ? <p className="text-sm text-slate-500 mt-4">Todavía no tenés clientes.</p> : null}
        </div>
      </div>
    </div>
  );
}
