import { actualizarEstadoTurno } from "./actions";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { ESTADO_BADGE } from "@/lib/dashboard/estados-colores";
import AgendaWeekGrid from "@/components/agenda-week-grid";
import LeyendaEstados from "@/components/leyenda-estados";
import { getDashboardData } from "@/lib/dashboard/queries";
import { calendarService } from "@/lib/services/calendar";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
}

interface TurnoRow
{
  readonly id: string;
  readonly staff_id: string;
  readonly servicio_id: string;
  readonly cliente_id: string;
  readonly inicio: string;
  readonly fin: string | null;
  readonly estado: "pendiente" | "confirmado" | "pagado" | "completado" | "cancelado" | "ausente";
  readonly sena_monto: number | null;
  readonly sena_porcentaje: number | null;
}

const ESTADO_ESTILOS: Record<TurnoRow["estado"], string> = ESTADO_BADGE;

function formatearInicio(iso: string, timeZone: string): string
{
  return formatearEnZona(iso, timeZone);
}

async function cambiarEstado(turnoId: string, nuevo: EstadoTurno): Promise<void>
{
  "use server";

  await actualizarEstadoTurno(turnoId, nuevo);
}

export default async function AgendaPage()
{
  const { data: dashboard } = await getDashboardData();
  const staff = dashboard.staff as StaffRow[];
  const negocioRow = dashboard.negocio as { id?: unknown; timezone?: unknown; pais?: unknown };
  const timeZone = resolverTimezoneNegocio({ timezone: negocioRow.timezone, pais: negocioRow.pais });
  const turnos = (dashboard.turnos as TurnoRow[]).slice().sort((a, b) =>
    new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const duracionPorServicio = new Map((dashboard.servicios as Array<{ id: string; duracion_min: number }>)
    .map((s) => [s.id, s.duracion_min]));
  const nombrePorServicio = new Map((dashboard.servicios as Array<{ id: string; nombre: string }>)
    .map((s) => [s.id, s.nombre]));
  const nombrePorCliente = new Map((dashboard.clientes as Array<{ id: string; nombre: string }>)
    .map((c) => [c.id, c.nombre]));

  const hoy = new Date();
  const externos = await calendarService.getExternalEventsForNegocio(
    String((dashboard.negocio as { id?: unknown }).id ?? ""),
    new Date(hoy.getTime() - 30 * 86_400_000), new Date(hoy.getTime() + 60 * 86_400_000))
    .then((eventos) => eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      inicio: e.inicio.toISOString(),
      fin: e.fin.toISOString(),
    })))
    .catch(() => []);

  const turnosGrilla = turnos.map((t) =>
  {
    const inicio = new Date(t.inicio);
    const finReal = t.fin !== null && !Number.isNaN(new Date(t.fin).getTime())
      ? new Date(t.fin)
      : new Date(inicio.getTime() + (duracionPorServicio.get(t.servicio_id) ?? 30) * 60_000);

    return {
      id: t.id,
      staffId: t.staff_id,
      inicio: t.inicio,
      fin: finReal.toISOString(),
      estado: t.estado,
      titulo: `${nombrePorCliente.get(t.cliente_id) ?? "Cliente"} · ` +
        `${nombrePorServicio.get(t.servicio_id) ?? "Servicio"}`,
    };
  });

  return (
    <div className="space-y-6">
    <AgendaWeekGrid
      base={hoy.toISOString()}
      timeZone={timeZone}
      staff={staff.map((s) => ({ id: s.id, nombre: s.nombre }))}
      turnos={turnosGrilla}
      externos={externos}
    />
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Agenda</h1>
      <p className="text-sm text-slate-600 mb-4">Turnos por profesional con estados reales</p>
      <div className="mb-6"><LeyendaEstados incluirExterno /></div>
      <div className="space-y-6">
        {staff.map((profesional) => (
          <section key={profesional.id}>
            <h2 className="font-semibold text-slate-900 mb-3">{profesional.nombre}</h2>
            <div className="space-y-3">
              {turnos.filter((t) => t.staff_id === profesional.id).map((turno) => (
                <div key={turno.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {(nombrePorServicio.get(turno.servicio_id) ?? "Servicio")
                          + " · " + formatearInicio(turno.inicio, timeZone)}
                      </p>
                      {turno.sena_monto !== null ? (
                        <p className="text-xs text-slate-500 mt-1">
                          {`Seña $${turno.sena_monto.toLocaleString("es-AR")}`}
                          {turno.sena_porcentaje !== null ? ` (${turno.sena_porcentaje}%)` : ""}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={"shrink-0 text-xs font-semibold px-3 py-1 rounded-full border "
                        + ESTADO_ESTILOS[turno.estado]}
                    >
                      {turno.estado}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {turno.estado === "pendiente" ? (
                      <>
                        <form action={cambiarEstado.bind(null, turno.id, "pagado")}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600
                            text-white hover:bg-green-700">
                            Marcar pagado
                          </button>
                        </form>
                        <form action={cambiarEstado.bind(null, turno.id, "cancelado")}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                            border-slate-300 hover:bg-slate-50">
                            Cancelar
                          </button>
                        </form>
                      </>
                    ) : null}
                    {turno.estado === "pagado" || turno.estado === "confirmado" ? (
                      <>
                        <form action={cambiarEstado.bind(null, turno.id, "completado")}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600
                            text-white hover:bg-blue-700">
                            Completar
                          </button>
                        </form>
                        <form action={cambiarEstado.bind(null, turno.id, "ausente")}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600
                            text-white hover:bg-red-700">
                            Ausente
                          </button>
                        </form>
                        <form action={cambiarEstado.bind(null, turno.id, "cancelado")}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                            border-slate-300 hover:bg-slate-50">
                            Cancelar
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              {turnos.filter((t) => t.staff_id === profesional.id).length === 0 ? (
                <p className="text-sm text-slate-500">Sin turnos para este profesional.</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
    </div>
  );
}
