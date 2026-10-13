import CopiarComprobante from "@/components/copiar-comprobante";
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
  readonly mp_payment_id?: string | null;
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

/**
 * Celda de comprobante: badge con nro copiable o guion sin pago.
 *
 * El detalle del pago vive en un sidepanel dentro de la cuenta de MP, sin
 * URL pública: el nro se copia para pegarlo en el buscador de Actividad.
 *
 * @param paymentId ID del pago (`mp_payment_id`) o null (`undefined` cuando
 *   el seed/fila no trae la clave).
 * @return Badge copiable o guion sin pago.
 */
function celdaComprobante(paymentId: string | null | undefined): React.ReactNode
{
  return <CopiarComprobante comprobanteId={paymentId ?? null} />;
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
    <div>
        <div className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">Pagos</h1>
              <p className="text-sm text-slate-400">Seguimiento financiero de señas</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Pendiente cobrar</div>
              <div className="text-2xl font-bold text-blue-400">{formatARS(totalPendiente)}</div>
            </div>
          </div>
          <div className="mb-4"><LeyendaEstados /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Servicio</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold">Seña</th>
                  <th className="pb-3 font-semibold">Saldo</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold">Fecha</th>
                  <th className="pb-3 font-semibold">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {turnos.map((turno) => (
                  <tr key={turno.id} className="hover:bg-white/10">
                    <td className="py-3 font-medium text-slate-100">
                      {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                    </td>
                    <td className="py-3 text-slate-400">
                      {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                    </td>
                    <td className="py-3 text-slate-400">{formatARS(turno.monto_total)}</td>
                    <td className="py-3 text-slate-400">{formatARS(turno.sena_monto)}</td>
                    <td className="py-3 text-slate-400">{formatARS((turno.monto_total ?? 0) - (turno.sena_monto ?? 0))}</td>
                    <td className="py-3">
                      <span className={"px-2 py-0.5 text-xs rounded-full font-semibold border "
                        + claseBadgePara(turno.estado)}>
                        {etiquetaEstadoPara(turno.estado)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(turno.inicio).toLocaleDateString("es-AR",
                        { day: "2-digit", month: "2-digit" })}
                    </td>
                    <td className="py-3 text-slate-400">
                      {celdaComprobante(turno.mp_payment_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {turnos.length === 0 ? <p className="text-sm text-slate-400 mt-4">Todavía no hay movimientos.</p> : null}
        </div>
    </div>
  );
}
