import { ajustarAusencia, cambiarBloqueoCliente, crearCliente, eliminarCliente } from "./actions";
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

type FiltroEstado = "todos" | "activos" | "lista-negra";

function normalizarFiltro(valor: string | undefined): FiltroEstado
{
  if (valor === "activos" || valor === "lista-negra")
  {
    return valor;
  }

  return "todos";
}

function coincideBusqueda(cliente: ClienteRow, query: string): boolean
{
  const q = query.trim().toLowerCase();

  if (q.length === 0)
  {
    return true;
  }

  return cliente.nombre.toLowerCase().includes(q) || cliente.whatsapp.toLowerCase().includes(q);
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string }>;
})
{
  const { data: dashboard } = await getDashboardData();
  const { q, filtro } = await searchParams;
  const clientes = dashboard.clientes as ClienteRow[];
  const turnos = dashboard.turnos as TurnoRow[];
  const filtroActivo = normalizarFiltro(filtro);
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

  const decisionDe = (cliente: ClienteRow): "allowed" | "blocked" | "fullDeposit" =>
    cliente.bloqueado
      ? "blocked"
      : evaluateCustomer(cliente.ausencias, { maxAllowedAbsences: umbral, penaltyOnExceed: penalidad });

  const filtrados = clientes.filter((cliente) =>
  {
    if (!coincideBusqueda(cliente, q ?? ""))
    {
      return false;
    }

    const decision = decisionDe(cliente);

    if (filtroActivo === "activos")
    {
      return decision === "allowed";
    }

    if (filtroActivo === "lista-negra")
    {
      return decision !== "allowed";
    }

    return true;
  });

  const totalActivos = clientes.filter((c) => decisionDe(c) === "allowed").length;
  const totalListaNegra = clientes.length - totalActivos;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-600 mt-1 text-sm">CRM local con ausencias y lista negra automática</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-slate-900">{clientes.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Activos</p>
          <p className="text-2xl font-bold text-slate-900">{totalActivos}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase">Lista negra</p>
          <p className="text-2xl font-bold text-slate-900">{totalListaNegra}</p>
        </div>
      </div>
      <form action={crearCliente} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Nuevo cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            name="nombre"
            required
            minLength={2}
            maxLength={80}
            placeholder="Nombre y apellido"
            className="px-4 py-2 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="tel"
            name="whatsapp"
            required
            minLength={6}
            maxLength={20}
            placeholder="WhatsApp (+549...)"
            className="px-4 py-2 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Agregar cliente
          </button>
        </div>
      </form>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <form method="get" className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o WhatsApp"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              name="filtro"
              value="todos"
              className={"text-xs font-semibold px-4 py-2 rounded-lg border transition-colors "
                + (filtroActivo === "todos"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50")}
            >
              Todos
            </button>
            <button
              type="submit"
              name="filtro"
              value="activos"
              className={"text-xs font-semibold px-4 py-2 rounded-lg border transition-colors "
                + (filtroActivo === "activos"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50")}
            >
              Activos
            </button>
            <button
              type="submit"
              name="filtro"
              value="lista-negra"
              className={"text-xs font-semibold px-4 py-2 rounded-lg border transition-colors "
                + (filtroActivo === "lista-negra"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50")}
            >
              Lista negra
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-6 py-3 font-semibold">Cliente</th>
                <th className="px-6 py-3 font-semibold">Turnos</th>
                <th className="px-6 py-3 font-semibold">Ausencias</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((cliente) =>
              {
                const historial = (turnosPorCliente.get(cliente.id) ?? []).slice()
                  .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
                const ultimo = historial[0];
                const decision = decisionDe(cliente);
                const enListaNegra = decision !== "allowed";

                return (
                  <tr key={cliente.id} className="hover:bg-slate-50 align-top">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{cliente.nombre}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{cliente.whatsapp}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {ultimo
                          ? "Último: " + (nombrePorServicio.get(ultimo.servicio_id) ?? "Servicio")
                            + " · " + ultimo.estado
                          : "Sin turnos"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{historial.length}</td>
                    <td className="px-6 py-4">
                      <span className={cliente.ausencias >= umbral
                        ? "text-red-600 font-semibold"
                        : "text-slate-600"}>
                        {cliente.ausencias}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {enListaNegra ? (
                        <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
                          {decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={ajustarAusencia.bind(null, cliente.id, 1)}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                            border-slate-300 hover:bg-slate-50" title="Sumar ausencia">
                            + Falta
                          </button>
                        </form>
                        <form action={ajustarAusencia.bind(null, cliente.id, -1)}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                            border-slate-300 hover:bg-slate-50" title="Quitar ausencia">
                            − Falta
                          </button>
                        </form>
                        <form action={cambiarBloqueoCliente.bind(null, cliente.id, !cliente.bloqueado)}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                            border-slate-300 hover:bg-slate-50">
                            {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                          </button>
                        </form>
                        <form action={eliminarCliente.bind(null, cliente.id)}>
                          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200
                            text-red-600 hover:bg-red-50">
                            Eliminar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {filtrados.map((cliente) =>
          {
            const historial = (turnosPorCliente.get(cliente.id) ?? []).slice()
              .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
            const decision = decisionDe(cliente);
            const enListaNegra = decision !== "allowed";

            return (
              <div key={cliente.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{cliente.nombre}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{cliente.whatsapp}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {historial.length} turnos · {cliente.ausencias} faltas
                    </p>
                  </div>
                  {enListaNegra ? (
                    <span className="shrink-0 inline-flex px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
                      {decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                      Activo
                    </span>
                  )}
                </div>
                <details className="mt-3 border border-slate-200 rounded-lg">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
                    Historial y acciones
                  </summary>
                  <div className="px-3 pb-3 pt-1 border-t border-slate-200">
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {historial.length === 0 ? <li>Sin turnos todavía.</li> : null}
                      {historial.slice(0, 5).map((turno) => (
                        <li key={turno.id}>
                          {(nombrePorServicio.get(turno.servicio_id) ?? "Servicio") + " · " + turno.estado}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <form action={ajustarAusencia.bind(null, cliente.id, 1)}>
                        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                          border-slate-300 hover:bg-slate-50">
                          + Falta
                        </button>
                      </form>
                      <form action={ajustarAusencia.bind(null, cliente.id, -1)}>
                        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                          border-slate-300 hover:bg-slate-50">
                          − Falta
                        </button>
                      </form>
                      <form action={cambiarBloqueoCliente.bind(null, cliente.id, !cliente.bloqueado)}>
                        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                          border-slate-300 hover:bg-slate-50">
                          {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                        </button>
                      </form>
                      <form action={eliminarCliente.bind(null, cliente.id)}>
                        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200
                          text-red-600 hover:bg-red-50">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        {filtrados.length === 0 ? (
          <p className="text-sm text-slate-500 px-6 py-6">
            {clientes.length === 0 ? "Todavía no tenés clientes." : "Ningún cliente coincide con la búsqueda."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
