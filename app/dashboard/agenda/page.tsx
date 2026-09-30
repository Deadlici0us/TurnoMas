import { actualizarEstadoTurno } from "./actions";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { getDashboardData } from "@/lib/dashboard/queries";

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
  readonly estado: "pendiente" | "confirmado" | "pagado" | "completado" | "cancelado" | "ausente";
  readonly sena_monto: number | null;
  readonly sena_porcentaje: number | null;
}

const ESTADO_ESTILOS: Record<TurnoRow["estado"], string> = {
  pagado: "bg-green-100 text-green-800 border-green-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  completado: "bg-slate-100 text-slate-600 border-slate-200",
  cancelado: "bg-slate-100 text-slate-500 border-slate-200",
  ausente: "bg-red-100 text-red-800 border-red-200",
};

function formatearInicio(iso: string): string
{
  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime()))
  {
    return iso;
  }

  return fecha.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  const turnos = (dashboard.turnos as TurnoRow[]).slice().sort((a, b) =>
    new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const nombrePorServicio = new Map((dashboard.servicios as Array<{ id: string; nombre: string }>)
    .map((s) => [s.id, s.nombre]));
  const nombrePorCliente = new Map((dashboard.clientes as Array<{ id: string; nombre: string }>)
    .map((c) => [c.id, c.nombre]));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Agenda</h1>
      <p className="text-sm text-slate-600 mb-6">Turnos por profesional con estados reales</p>
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
                          + " · " + formatearInicio(turno.inicio)}
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
  );
}
