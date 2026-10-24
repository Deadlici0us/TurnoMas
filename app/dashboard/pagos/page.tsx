import CopiarComprobante from "@/components/copiar-comprobante";
import LeyendaEstados from "@/components/leyenda-estados";
import TablaFiltrable from "@/components/tabla-filtrable";
import { getDashboardData } from "@/lib/dashboard/queries";
import { formatearARS } from "@/lib/dashboard/moneda";
import { claseBadgePara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import
{
  formatearEnZonaConFecha,
  formatearEnZonaConSegundos,
  resolverTimezoneNegocio,
} from "@/lib/timezone/timezone";

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
  readonly updated_at?: string | null;
  readonly created_at?: string | null;
}

const ESTADOS_CON_PAGO: ReadonlySet<TurnoRow["estado"]> = new Set(["pagado", "completado"]);

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

/**
 * Fecha de acreditación de la seña con precisión de segundos.
 *
 * Sin columna dedicada en `turnos`, `updated_at` es el mejor proxy: el
 * trigger `set_updated_at()` lo actualiza al confirmar el pago (webhook
 * de MercadoPago o "Marcar seña pagada"). Solo aplica a estados con
 * cobro acreditado; en cualquier otro caso muestra guion.
 *
 * @param turno Fila del turno con estado y `updated_at`.
 * @param timeZone Zona IANA del negocio.
 * @return `DD/MM/YYYY HH:mm:ss` en hora civil o guion sin acreditación.
 */
function celdaPagoSena(turno: TurnoRow, timeZone: string): string
{
  if (!ESTADOS_CON_PAGO.has(turno.estado))
  {
    return "—";
  }

  if (typeof turno.updated_at !== "string" || Number.isNaN(new Date(turno.updated_at).getTime()))
  {
    return "—";
  }

  return formatearEnZonaConSegundos(turno.updated_at, timeZone);
}

/**
 * Ordena turnos por fecha con recientes primero y desempates estables.
 *
 * @param turnos Filas a ordenar.
 * @return Nueva lista ordenada por `inicio` desc, `updated_at` desc e `id`.
 */
function ordenarPorFecha(turnos: TurnoRow[]): TurnoRow[]
{
  return turnos.slice().sort((a, b) =>
  {
    const porInicio = new Date(b.inicio).getTime() - new Date(a.inicio).getTime();

    if (porInicio !== 0)
    {
      return porInicio;
    }

    const actualizadoA = typeof a.updated_at === "string" ? new Date(a.updated_at).getTime() : Number.NaN;
    const actualizadoB = typeof b.updated_at === "string" ? new Date(b.updated_at).getTime() : Number.NaN;
    const porActualizado = (Number.isNaN(actualizadoB) ? 0 : actualizadoB)
      - (Number.isNaN(actualizadoA) ? 0 : actualizadoA);

    if (porActualizado !== 0)
    {
      return porActualizado;
    }

    return a.id.localeCompare(b.id);
  });
}

export default async function PagosPage()
{
  const { data: dashboard } = await getDashboardData();
  const negocioRow = dashboard.negocio as { timezone?: unknown; pais?: unknown };
  const timeZone = resolverTimezoneNegocio({ timezone: negocioRow.timezone, pais: negocioRow.pais });
  const turnos = ordenarPorFecha(dashboard.turnos as TurnoRow[]);
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
        <div className="ui-card p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="ui-page-title">Pagos</h1>
              <p className="ui-page-subtitle">Seguimiento financiero de señas.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pendiente cobrar
              </div>
              <div className="font-heading text-2xl font-bold text-navy tabular-nums">
                {formatearARS(totalPendiente)}
              </div>
            </div>
          </div>
          <div className="mb-4"><LeyendaEstados /></div>
          <TablaFiltrable
            encabezados={(
              <tr>
                <th className="ui-th">Cliente</th>
                <th className="ui-th">Servicio</th>
                <th className="ui-th">Total</th>
                <th className="ui-th">Seña</th>
                <th className="ui-th">Saldo</th>
                <th className="ui-th">Estado</th>
                <th className="ui-th">Inicio</th>
                <th className="ui-th">Pago seña</th>
                <th className="ui-th">Comprobante</th>
              </tr>
            )}
            filas={turnos.map((turno) => ({
              key: turno.id,
              busqueda: [
                nombrePorCliente.get(turno.cliente_id) ?? "Cliente",
                nombrePorServicio.get(turno.servicio_id) ?? "Servicio",
                etiquetaEstadoPara(turno.estado),
              ],
              contenido: (
                <tr className="ui-tr">
                  <td className="ui-td font-medium text-ink">
                    {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                  </td>
                  <td className="ui-td text-muted-foreground">
                    {nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}
                  </td>
                  <td className="ui-td text-muted-foreground">{formatearARS(turno.monto_total)}</td>
                  <td className="ui-td text-muted-foreground">{formatearARS(turno.sena_monto)}</td>
                  <td className="ui-td text-muted-foreground">{formatearARS((turno.monto_total ?? 0) - (turno.sena_monto ?? 0))}</td>
                  <td className="ui-td">
                    <span className={`ui-badge ${claseBadgePara(turno.estado)}`}>
                      {etiquetaEstadoPara(turno.estado)}
                    </span>
                  </td>
                  <td className="ui-td whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatearEnZonaConFecha(turno.inicio, timeZone)}
                  </td>
                  <td className="ui-td whitespace-nowrap text-muted-foreground tabular-nums">
                    {celdaPagoSena(turno, timeZone)}
                  </td>
                  <td className="ui-td text-muted-foreground">
                    {celdaComprobante(turno.mp_payment_id)}
                  </td>
                </tr>
              ),
            }))}
            placeholder="Buscar por cliente, servicio o estado"
            vacioSinDatos="Todavía no hay movimientos."
            vacioSinCoincidencias="Ningún movimiento coincide con la búsqueda."
          />
        </div>
    </div>
  );
}
