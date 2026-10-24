import
{
  ajustarAusencia as ajustarAusenciaAction,
  cambiarBloqueoCliente as cambiarBloqueoClienteAction,
  crearCliente as crearClienteAction,
  eliminarCliente as eliminarClienteAction,
} from "./actions";
import FormularioCliente from "@/components/formulario-cliente";
import ListaClientes, { type ClienteListado, type FiltroEstado } from "@/components/lista-clientes";
import type { ActionResult } from "@/lib/actions/action-result";
import { runAction } from "@/lib/actions/run-action";
import PageHeader from "@/components/ui/page-header";
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

function normalizarFiltro(valor: string | undefined): FiltroEstado
{
  if (valor === "activos" || valor === "lista-negra")
  {
    return valor;
  }

  return "todos";
}

async function crearCliente(formData: FormData): Promise<ActionResult<void>>
{
  "use server";

  return runAction("crearCliente", async () =>
  {
    await crearClienteAction(formData);
  });
}

async function ajustarAusencia(clienteId: string, delta: 1 | -1): Promise<ActionResult<void>>
{
  "use server";

  return runAction("ajustarAusencia", async () =>
  {
    await ajustarAusenciaAction(clienteId, delta);
  });
}

async function cambiarBloqueoCliente(clienteId: string, bloqueado: boolean): Promise<ActionResult<void>>
{
  "use server";

  return runAction("cambiarBloqueoCliente", async () =>
  {
    await cambiarBloqueoClienteAction(clienteId, bloqueado);
  });
}

async function eliminarCliente(clienteId: string): Promise<ActionResult<void>>
{
  "use server";

  return runAction("eliminarCliente", async () =>
  {
    await eliminarClienteAction(clienteId);
  });
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
      clienteNombre: cliente.nombre,
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

  const totalActivos = clientes.filter((c) => decisionDe(c) === "allowed").length;
  const totalListaNegra = clientes.length - totalActivos;

  const clientesListado: ClienteListado[] = clientes.map((cliente) =>
  {
    const historial = (turnosPorCliente.get(cliente.id) ?? []).slice()
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())
      .map((turno) => ({
        id: turno.id,
        servicio: nombrePorServicio.get(turno.servicio_id) ?? "Servicio",
        estado: turno.estado,
        estadoEtiqueta: etiquetaEstadoPara(turno.estado),
      }));
    const decision = decisionDe(cliente);

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      whatsapp: cliente.whatsapp,
      email: cliente.email,
      ausencias: cliente.ausencias,
      bloqueado: cliente.bloqueado,
      decision,
      historial,
      whatsappLink: linkRemarketing(cliente, historial[0]?.servicio ?? "tu servicio"),
      acciones: {
        sumarFalta: ajustarAusencia.bind(null, cliente.id, 1),
        restarFalta: ajustarAusencia.bind(null, cliente.id, -1),
        alternarBloqueo: cambiarBloqueoCliente.bind(null, cliente.id, !cliente.bloqueado),
        eliminar: eliminarCliente.bind(null, cliente.id),
      },
    };
  });

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
      <FormularioCliente
        action={crearCliente}
        titulo="Nuevo cliente"
        cta="Agregar cliente"
        successMessage="Cliente agregado."
        className="ui-card mb-6 p-5 sm:p-6"
      />
      <ListaClientes
        clientes={clientesListado}
        initialQuery={q ?? ""}
        initialFiltro={filtroActivo}
        umbral={umbral}
      />
    </div>
  );
}
