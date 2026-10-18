import Link from "next/link";
import { notFound } from "next/navigation";

import { evaluateCustomer } from "@/lib/blacklist/blacklist";
import { claseBadgePara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { construirHistorialCliente, resumirHistorial } from "@/lib/dashboard/historial-cliente";
import { formatearARS } from "@/lib/dashboard/moneda";
import { getDashboardData } from "@/lib/dashboard/queries";
import { normalizarWhatsappParaLink } from "@/lib/notifications/whatsapp";
import { formatearEnZonaConFecha, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

interface ClienteRow
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly ausencias: number;
  readonly bloqueado: boolean;
}

interface ServicioRow
{
  readonly id: string;
  readonly nombre: string;
}

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
}

interface TurnoRow
{
  readonly id: string;
  readonly cliente_id: string;
  readonly servicio_id: string;
  readonly staff_id: string;
  readonly inicio: string;
  readonly estado: string;
  readonly monto_total: number | null;
  readonly sena_monto: number | null;
}

interface EstadoFicha
{
  readonly etiqueta: string;
  readonly clase: string;
}

function resolverEstadoFicha(
  cliente: ClienteRow,
  umbral: number,
  penalidad: "blocked" | "fullDeposit",
): EstadoFicha
{
  const decision = cliente.bloqueado
    ? "blocked"
    : evaluateCustomer(cliente.ausencias, { maxAllowedAbsences: umbral, penaltyOnExceed: penalidad });

  if (decision === "blocked")
  {
    return { etiqueta: "Bloqueado", clase: "bg-red-500/10 text-red-300" };
  }

  if (decision === "fullDeposit")
  {
    return { etiqueta: "Seña 100%", clase: "bg-red-500/10 text-red-300" };
  }

  return { etiqueta: "Activo", clase: "bg-green-500/10 text-green-300" };
}

/** Ficha del cliente con su historial completo de servicios (solo lectura). */
export default async function ClienteDetallePage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
})
{
  const { id } = await params;
  const { data: dashboard } = await getDashboardData();
  const clientes = dashboard.clientes as ClienteRow[];
  const cliente = clientes.find((c) => c.id === id);

  if (cliente === undefined)
  {
    notFound();
  }

  const turnos = dashboard.turnos as TurnoRow[];
  const historial = construirHistorialCliente(turnos, cliente.id);
  const resumen = resumirHistorial(historial);
  const negocioRow = dashboard.negocio as {
    blacklist_umbral?: unknown;
    blacklist_penalidad?: unknown;
    timezone?: unknown;
    pais?: unknown;
  };
  const umbral = typeof negocioRow.blacklist_umbral === "number" ? negocioRow.blacklist_umbral : 2;
  const penalidad: "blocked" | "fullDeposit" =
    negocioRow.blacklist_penalidad === "blocked" ? "blocked" : "fullDeposit";
  const estado = resolverEstadoFicha(cliente, umbral, penalidad);
  const timeZone = resolverTimezoneNegocio({ timezone: negocioRow.timezone, pais: negocioRow.pais });
  const nombrePorServicio = new Map((dashboard.servicios as ServicioRow[])
    .map((s) => [s.id, s.nombre]));
  const nombrePorStaff = new Map((dashboard.staff as StaffRow[]).map((s) => [s.id, s.nombre]));
  const numeroWhatsapp = normalizarWhatsappParaLink(cliente.whatsapp);

  return (
    <div>
      <Link href="/dashboard/clientes" className="text-sm font-semibold text-slate-400 hover:text-slate-100">
        ← Clientes
      </Link>
      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">{cliente.nombre}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${estado.clase}`}>
              {estado.etiqueta}
            </span>
          </div>
          <p className="text-slate-400 mt-1 text-sm">{cliente.whatsapp}</p>
        </div>
        {numeroWhatsapp !== null ? (
          <a
            href={`https://wa.me/${numeroWhatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border
              border-green-500/40 text-green-300 hover:bg-green-500/20"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6">
          <p className="text-xs font-medium text-slate-400 uppercase">Turnos</p>
          <p className="text-2xl font-bold text-slate-100">{resumen.total}</p>
        </div>
        <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6">
          <p className="text-xs font-medium text-slate-400 uppercase">Completados</p>
          <p className="text-2xl font-bold text-slate-100">{resumen.completados}</p>
        </div>
        <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6">
          <p className="text-xs font-medium text-slate-400 uppercase">Ausencias</p>
          <p className={`text-2xl font-bold ${cliente.ausencias >= umbral ? "text-red-400" : "text-slate-100"}`}>
            {cliente.ausencias}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6">
          <p className="text-xs font-medium text-slate-400 uppercase">Señas cobradas</p>
          <p className="text-2xl font-bold text-slate-100">{formatearARS(resumen.totalSenas)}</p>
        </div>
      </div>
      <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur overflow-hidden">
        <h2 className="px-6 pt-5 font-semibold text-slate-100">Historial de servicios</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-400 px-6 py-6">Este cliente todavía no tuvo turnos.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-6 py-3 font-semibold">Fecha</th>
                  <th className="px-6 py-3 font-semibold">Servicio</th>
                  <th className="px-6 py-3 font-semibold">Profesional</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                  <th className="px-6 py-3 font-semibold text-right">Total</th>
                  <th className="px-6 py-3 font-semibold text-right">Seña</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {historial.map((turno) => (
                  <tr key={turno.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 text-slate-400 tabular-nums whitespace-nowrap">
                      {formatearEnZonaConFecha(turno.inicio, timeZone)}
                    </td>
                    <td className="px-6 py-4 text-slate-100">
                      {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {nombrePorStaff.get(turno.staff_id) ?? "Profesional"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={"px-2 py-0.5 text-xs rounded-full font-semibold border "
                        + claseBadgePara(turno.estado)}>
                        {etiquetaEstadoPara(turno.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-right tabular-nums">
                      {formatearARS(turno.monto_total)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-right tabular-nums">
                      {formatearARS(turno.sena_monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
