import Link from "next/link";

import { ajustarAusencia, cambiarBloqueoCliente, crearCliente, eliminarCliente } from "./actions";
import ActionForm from "@/components/ui/action-form";
import PageHeader from "@/components/ui/page-header";
import SubmitButton from "@/components/ui/submit-button";
import { evaluateCustomer } from "@/lib/blacklist/blacklist";
import { etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { getDashboardData } from "@/lib/dashboard/queries";
import { readEnv } from "@/lib/env/env";
import { linkRemarketingWhatsapp } from "@/lib/remarketing/link";

interface ClienteRow
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email?: string | null;
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
  readonly searchParams: Promise<{ q?: string; filtro?: string }>;
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
  const negocioRow = dashboard.negocio as {
    nombre?: string; pais?: string; slug?: string;
    msg_remarketing_subject?: unknown; msg_remarketing_cuerpo?: unknown;
  };
  const negocioNombre = typeof negocioRow.nombre === "string" ? negocioRow.nombre : "tu negocio";
  const base = readEnv("NEXT_PUBLIC_APP_URL")
    ?? (readEnv("VERCEL_URL") !== null ? `https://${readEnv("VERCEL_URL") as string}` : null);
  const portalUrl = base !== null && typeof negocioRow.pais === "string" && typeof negocioRow.slug === "string"
    ? `${base}/${negocioRow.pais}/${negocioRow.slug}`
    : null;

  /** Link wa.me de remarketing manual para un cliente (null sin portal). */
  function linkRemarketing(cliente: ClienteRow, ultimoServicio: string): string | null
  {
    return linkRemarketingWhatsapp({
      whatsapp: cliente.whatsapp,
      portalUrl,
      negocioNombre,
      msg_remarketing_subject: typeof negocioRow.msg_remarketing_subject === "string"
        ? negocioRow.msg_remarketing_subject
        : null,
      msg_remarketing_cuerpo: typeof negocioRow.msg_remarketing_cuerpo === "string"
        ? negocioRow.msg_remarketing_cuerpo
        : null,
      servicioNombre: ultimoServicio,
    });
  }
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
      <PageHeader
        title="Clientes"
        subtitle="CRM local con ausencias y lista negra automática."
      />
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="ui-card p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total</p>
          <p className="mt-2 text-2xl font-bold text-ink tabular-nums">{clientes.length}</p>
        </div>
        <div className="ui-card p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Activos</p>
          <p className="mt-2 text-2xl font-bold text-[#0c6b45] tabular-nums">{totalActivos}</p>
        </div>
        <div className="ui-card p-4 sm:p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Lista negra</p>
          <p className="mt-2 text-2xl font-bold text-danger tabular-nums">{totalListaNegra}</p>
        </div>
      </div>
      <ActionForm
        action={crearCliente}
        successMessage="Cliente agregado."
        className="ui-card mb-6 p-5 sm:p-6"
      >
        <h2 className="ui-section-title mb-4">Nuevo cliente</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="nombre"
            required
            minLength={2}
            maxLength={80}
            placeholder="Nombre y apellido"
            className="ui-input"
          />
          <input
            type="tel"
            name="whatsapp"
            required
            minLength={6}
            maxLength={20}
            placeholder="WhatsApp (+549...)"
            className="ui-input"
          />
          <SubmitButton pendingLabel="Agregando...">Agregar cliente</SubmitButton>
        </div>
      </ActionForm>
      <div className="ui-card mb-6 p-5 sm:p-6">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o WhatsApp"
            className="ui-input flex-1"
          />
          <div className="flex flex-wrap gap-1">
            {([
              ["todos", "Todos"],
              ["activos", "Activos"],
              ["lista-negra", "Lista negra"],
            ] as const).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="submit"
                name="filtro"
                value={valor}
                className={`ui-tab ${filtroActivo === valor ? "ui-tab-active" : ""}`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </form>
      </div>
      <div className="ui-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="ui-th px-6">Cliente</th>
                <th className="ui-th px-6">Turnos</th>
                <th className="ui-th px-6">Ausencias</th>
                <th className="ui-th px-6">Estado</th>
                <th className="ui-th px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtrados.map((cliente) =>
              {
                const historial = (turnosPorCliente.get(cliente.id) ?? []).slice()
                  .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
                const ultimo = historial[0];
                const decision = decisionDe(cliente);
                const enListaNegra = decision !== "allowed";

                return (
                  <tr key={cliente.id} className="ui-tr align-top">
                    <td className="ui-td px-6">
                      <Link
                        href={"/dashboard/clientes/" + cliente.id}
                        className="font-medium text-ink hover:text-[#0b6e93]"
                      >
                        {cliente.nombre}
                      </Link>
                      <p className="text-muted-foreground text-xs mt-0.5">{cliente.whatsapp}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {ultimo
                          ? "Último: " + (nombrePorServicio.get(ultimo.servicio_id) ?? "Servicio")
                            + " · " + ultimo.estado
                          : "Sin turnos"}
                      </p>
                    </td>
                    <td className="ui-td px-6 text-muted-foreground">{historial.length}</td>
                    <td className="ui-td px-6">
                      <span className={cliente.ausencias >= umbral
                        ? "text-danger font-semibold"
                        : "text-muted-foreground"}>
                        {cliente.ausencias}
                      </span>
                    </td>
                    <td className="ui-td px-6">
                      {enListaNegra ? (
                        <span className="ui-badge ui-badge-danger">
                          {decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                        </span>
                      ) : (
                        <span className="ui-badge ui-badge-success">Activo</span>
                      )}
                    </td>
                    <td className="ui-td px-6">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={"/dashboard/agenda/nuevo?clienteId=" + cliente.id}
                          className="ui-btn ui-btn-outline ui-btn-sm"
                        >
                          Agregar turno
                        </Link>
                        {(() =>
                        {
                          const wa = linkRemarketing(cliente, ultimo !== undefined
                            ? (nombrePorServicio.get(ultimo.servicio_id) ?? "tu servicio")
                            : "tu servicio");

                          return wa !== null ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                                hover:bg-success-soft"
                            >
                              WhatsApp
                            </a>
                          ) : null;
                        })()}
                        <ActionForm
                          action={ajustarAusencia.bind(null, cliente.id, 1)}
                          successMessage="Ausencia registrada."
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            + Falta
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={ajustarAusencia.bind(null, cliente.id, -1)}
                          successMessage="Ausencia descontada."
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            − Falta
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={cambiarBloqueoCliente.bind(null, cliente.id, !cliente.bloqueado)}
                          successMessage={cliente.bloqueado ? "Cliente desbloqueado." : "Cliente bloqueado."}
                        >
                          <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                            {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm
                          action={eliminarCliente.bind(null, cliente.id)}
                          successMessage="Cliente eliminado."
                        >
                          <SubmitButton className="ui-btn ui-btn-danger ui-btn-sm">
                            Eliminar
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-line">
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
                    <Link
                      href={"/dashboard/clientes/" + cliente.id}
                      className="font-medium text-ink hover:text-[#0b6e93]"
                    >
                      {cliente.nombre}
                    </Link>
                    <p className="text-muted-foreground text-xs mt-0.5">{cliente.whatsapp}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {historial.length} turnos · {cliente.ausencias} faltas
                    </p>
                  </div>
                  {enListaNegra ? (
                    <span className="ui-badge ui-badge-danger shrink-0">
                      {decision === "blocked" ? "Bloqueado" : "Seña 100%"}
                    </span>
                  ) : (
                    <span className="ui-badge ui-badge-success shrink-0">Activo</span>
                  )}
                </div>
                <details className="mt-3 border border-line rounded-lg">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-ink">
                    Historial y acciones
                  </summary>
                  <div className="px-3 pb-3 pt-1 border-t border-line">
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {historial.length === 0 ? <li>Sin turnos todavía.</li> : null}
                      {historial.slice(0, 5).map((turno) => (
                        <li key={turno.id}>
                          {(nombrePorServicio.get(turno.servicio_id) ?? "Servicio") + " · " + etiquetaEstadoPara(turno.estado)}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={"/dashboard/agenda/nuevo?clienteId=" + cliente.id}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                      >
                        Agregar turno
                      </Link>
                      {(() =>
                      {
                        const ultimoMovil = historial[0];
                        const wa = linkRemarketing(cliente, ultimoMovil !== undefined
                          ? (nombrePorServicio.get(ultimoMovil.servicio_id) ?? "tu servicio")
                          : "tu servicio");

                        return wa !== null ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                              hover:bg-success-soft"
                          >
                            WhatsApp
                          </a>
                        ) : null;
                      })()}
                      <ActionForm
                        action={ajustarAusencia.bind(null, cliente.id, 1)}
                        successMessage="Ausencia registrada."
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">+ Falta</SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={ajustarAusencia.bind(null, cliente.id, -1)}
                        successMessage="Ausencia descontada."
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">− Falta</SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={cambiarBloqueoCliente.bind(null, cliente.id, !cliente.bloqueado)}
                        successMessage={cliente.bloqueado ? "Cliente desbloqueado." : "Cliente bloqueado."}
                      >
                        <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                          {cliente.bloqueado ? "Desbloquear" : "Bloquear"}
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={eliminarCliente.bind(null, cliente.id)}
                        successMessage="Cliente eliminado."
                      >
                        <SubmitButton className="ui-btn ui-btn-danger ui-btn-sm">Eliminar</SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-6">
            {clientes.length === 0 ? "Todavía no tenés clientes." : "Ningún cliente coincide con la búsqueda."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
