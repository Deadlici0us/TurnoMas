import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BadgeCheck, CalendarClock, CalendarDays, CircleDollarSign, TriangleAlert } from "lucide-react";

import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import Panel from "@/components/ui/panel";
import StatCard from "@/components/ui/stat-card";
import StatusBadge from "@/components/ui/status-badge";
import { formatearARS } from "@/lib/dashboard/moneda";
import { getDashboardData, getDashboardStats } from "@/lib/dashboard/queries";
import { debeAvisarConexionMp } from "@/lib/dashboard/conexion-mp";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { avisoSuscripcion } from "@/lib/onboarding/trial";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

const formatARS = formatearARS;

export default async function DashboardPage()
{
  const t = await getTranslations("common");
  const { data: dashboard } = await getDashboardData();

  const negocioRow = dashboard.negocio as {
    id?: unknown;
    nombre?: unknown;
    created_at?: unknown;
    suscripcion_estado?: unknown;
    suscripcion_mp_id?: unknown;
    suscripcion_mora_desde?: unknown;
  };

  const subscription = getNegocioSubscriptionStatus({
    created_at: typeof negocioRow.created_at === "string" ? negocioRow.created_at : null,
    suscripcion_estado:
      typeof negocioRow.suscripcion_estado === "string" ? negocioRow.suscripcion_estado : null,
    suscripcion_mp_id:
      typeof negocioRow.suscripcion_mp_id === "string" ? negocioRow.suscripcion_mp_id : null,
    suscripcion_mora_desde:
      typeof negocioRow.suscripcion_mora_desde === "string" ? negocioRow.suscripcion_mora_desde : null,
  });

  const aviso = avisoSuscripcion(subscription,
    typeof negocioRow.created_at === "string" ? negocioRow.created_at : null);

  let mpToken: string | null = null;

  try
  {
    const negocioId = dashboard.negocio.id;

    if (typeof negocioId === "string")
    {
      const { data: secretos } = await getSupabaseAdmin().from("negocio_secretos")
        .select("mercadopago_access_token").eq("negocio_id", negocioId).single();
      const raw = (secretos as { mercadopago_access_token?: unknown } | null)
        ?.mercadopago_access_token;
      mpToken = typeof raw === "string" && raw.length > 0 ? raw : null;
    }
  }
  catch
  {
    mpToken = null;
  }

  const avisarMp = debeAvisarConexionMp(mpToken,
    dashboard.servicios as { sena_requerida?: unknown }[]);

  const stats = await getDashboardStats(String(dashboard.negocio.id ?? ""));

  const nombrePorServicio = new Map<string, string>(
    dashboard.servicios.map((s: { id: string; nombre: string }) => [s.id, s.nombre]),
  );
  const nombrePorCliente = new Map<string, string>(
    dashboard.clientes.map((c: { id: string; nombre: string }) => [c.id, c.nombre]),
  );
  const nombrePorStaff = new Map<string, string>(
    (dashboard.staff as Array<{ id: string; nombre: string }>).map((s) => [s.id, s.nombre]),
  );
  const timeZone = resolverTimezoneNegocio({
    timezone: (negocioRow as { timezone?: unknown }).timezone,
    pais: (negocioRow as { pais?: unknown }).pais,
  });

  const avisos = [
    aviso !== null ? { texto: aviso, href: "/dashboard/suscripcion", cta: "Ver suscripción" } : null,
    avisarMp
      ? {
        texto: "Tenés servicios con seña pero sin MercadoPago conectado: las reservas quedan pendientes sin link de pago.",
        href: "/dashboard/config",
        cta: "Conectar MercadoPago",
      }
      : null,
    (() =>
    {
      const pendientesRemarketing = candidatosDesdeDashboard(dashboard).length;

      if (pendientesRemarketing === 0)
      {
        return null;
      }

      return {
        texto: pendientesRemarketing === 1
          ? "Tenés 1 cliente para remarketing."
          : `Tenés ${pendientesRemarketing} clientes para remarketing.`,
        href: "/dashboard/remarketing",
        cta: "Ver lista",
      };
    })(),
  ].filter((a): a is { texto: string; href: string; cta: string } => a !== null);

  const indicadores = [
    {
      etiqueta: "Turnos hoy",
      valor: String(stats.turnosHoy),
      detalle: `${stats.pendientes} pendientes de pago`,
      Icono: CalendarClock,
      tone: "teal" as const,
    },
    {
      etiqueta: "Pendientes",
      valor: String(stats.pendientes),
      detalle: "Esperando seña",
      Icono: TriangleAlert,
      tone: "amber" as const,
    },
    {
      etiqueta: "Señas cobradas",
      valor: String(stats.pagados),
      detalle: `${stats.confirmados} confirmados sin seña`,
      Icono: BadgeCheck,
      tone: "green" as const,
    },
    {
      etiqueta: "Ingresos por señas",
      valor: formatARS(stats.totalIngresos),
      detalle: "Acumulado cobrado",
      Icono: CircleDollarSign,
      tone: "navy" as const,
    },
  ];

  const proximos = (dashboard.turnos as Array<{
    id: string;
    estado: string;
    servicio_id: string;
    cliente_id: string;
    staff_id?: string;
    inicio?: string;
    monto_total: number | null;
  }>).slice().sort((a, b) =>
    new Date(a.inicio ?? 0).getTime() - new Date(b.inicio ?? 0).getTime()).slice(0, 8);

  return (
    <div>
      <PageHeader
        title={String(dashboard.negocio.nombre ?? t("appName"))}
        subtitle="Agenda, equipo, servicios y cobros en un solo lugar."
        actions={(
          <Link href="/dashboard/agenda" className="ui-btn ui-btn-primary">
            <CalendarDays className="size-4" aria-hidden="true" />
            Abrir agenda
          </Link>
        )}
      />
      {avisos.length > 0 ? (
        <output className="mb-6 block space-y-2">
          {avisos.map((a) => (
            <span key={a.cta} className="ui-alert ui-alert-warning block">
              {a.texto}{" "}
              <Link href={a.href} className="font-semibold underline underline-offset-2">
                {a.cta}
              </Link>
            </span>
          ))}
        </output>
      ) : null}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 xl:grid-cols-4">
        {indicadores.map(({ etiqueta, valor, detalle, Icono, tone }) => (
          <StatCard
            key={etiqueta}
            label={etiqueta}
            value={valor}
            detail={detalle}
            Icon={Icono}
            tone={tone}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel
          title="Próximos turnos"
          actions={(
            <Link href="/dashboard/agenda" className="ui-link text-sm">
              Ver agenda
            </Link>
          )}
          bodyClassName="p-0 sm:p-0"
        >
          {proximos.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                Icon={CalendarDays}
                title="Todavía no tenés turnos"
                description="Compartí tu link público para empezar a recibir reservas."
                action={(
                  <Link href="/dashboard/agenda" className="ui-btn ui-btn-primary ui-btn-sm">
                    Ver agenda
                  </Link>
                )}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {proximos.map((turno) => (
                <li key={turno.id} className="ui-tr flex min-h-16 items-center gap-3 px-5 py-3 sm:px-6">
                  <div className="w-16 shrink-0 font-mono text-[13px] font-semibold text-navy tabular-nums">
                    {typeof turno.inicio === "string" ? formatearEnZona(turno.inicio, timeZone) : "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      <span>{nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}</span>
                      {typeof turno.staff_id === "string" && nombrePorStaff.get(turno.staff_id) !== undefined
                        ? ` · ${nombrePorStaff.get(turno.staff_id)}`
                        : ""}
                      <span>{` · ${formatARS(turno.monto_total)}`}</span>
                    </p>
                  </div>
                  <StatusBadge estado={turno.estado} className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Hoy" description="Tu día de un vistazo.">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Turnos</dt>
              <dd className="font-bold text-ink tabular-nums">{stats.turnosHoy}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Señas de hoy</dt>
              <dd className="font-bold text-ink tabular-nums">{stats.pagados}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Ingresos</dt>
              <dd className="font-bold text-ink tabular-nums">{formatARS(stats.totalIngresos)}</dd>
            </div>
          </dl>
          <Link href="/dashboard/agenda" className="ui-btn ui-btn-primary mt-5 w-full">
            Abrir agenda de hoy
          </Link>
        </Panel>
      </div>
    </div>
  );
}
