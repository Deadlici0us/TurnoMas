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
    return { etiqueta: "Bloqueado", clase: "ui-badge-danger" };
  }

  if (decision === "fullDeposit")
  {
    return { etiqueta: "Seña 100%", clase: "ui-badge-danger" };
  }

  return { etiqueta: "Activo", clase: "ui-badge-success" };
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
      <Link href="/dashboard/clientes" className="ui-link text-sm">
        ← Clientes
      </Link>
      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="ui-page-title">{cliente.nombre}</h1>
            <span className={`ui-badge ${estado.clase}`}>{estado.etiqueta}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{cliente.whatsapp}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={"/dashboard/agenda/nuevo?clienteId=" + cliente.id}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            Agregar turno
          </Link>
          {numeroWhatsapp !== null ? (
            <a
              href={`https://wa.me/${numeroWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                hover:bg-success-soft"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="ui-card p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase">Turnos</p>
          <p className="text-2xl font-bold text-ink">{resumen.total}</p>
        </div>
        <div className="ui-card p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase">Completados</p>
          <p className="text-2xl font-bold text-ink">{resumen.completados}</p>
        </div>
        <div className="ui-card p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase">Ausencias</p>
          <p className={`text-2xl font-bold ${cliente.ausencias >= umbral ? "text-danger" : "text-ink"}`}>
            {cliente.ausencias}
          </p>
        </div>
        <div className="ui-card p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase">Señas cobradas</p>
          <p className="text-2xl font-bold text-ink">{formatearARS(resumen.totalSenas)}</p>
        </div>
      </div>
      <div className="ui-card overflow-hidden">
        <h2 className="ui-section-title px-6 pt-5">Historial de servicios</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-6">Este cliente todavía no tuvo turnos.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-th px-6">Fecha</th>
                  <th className="ui-th px-6">Servicio</th>
                  <th className="ui-th px-6">Profesional</th>
                  <th className="ui-th px-6">Estado</th>
                  <th className="ui-th px-6 text-right">Total</th>
                  <th className="ui-th px-6 text-right">Seña</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {historial.map((turno) => (
                  <tr key={turno.id} className="ui-tr">
                    <td className="ui-td px-6 text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatearEnZonaConFecha(turno.inicio, timeZone)}
                    </td>
                    <td className="ui-td px-6 text-ink">
                      {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                    </td>
                    <td className="ui-td px-6 text-muted-foreground">
                      {nombrePorStaff.get(turno.staff_id) ?? "Profesional"}
                    </td>
                    <td className="ui-td px-6">
                      <span className={`ui-badge ${claseBadgePara(turno.estado)}`}>
                        {etiquetaEstadoPara(turno.estado)}
                      </span>
                    </td>
                    <td className="ui-td px-6 text-right text-muted-foreground tabular-nums">
                      {formatearARS(turno.monto_total)}
                    </td>
                    <td className="ui-td px-6 text-right text-muted-foreground tabular-nums">
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
