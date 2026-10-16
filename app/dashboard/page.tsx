import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarClock, CircleDollarSign, TriangleAlert } from "lucide-react";

import { getDashboardData, getDashboardStats } from "@/lib/dashboard/queries";
import { debeAvisarConexionMp } from "@/lib/dashboard/conexion-mp";
import { claseBadgePara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import { getNegocioSubscriptionStatus } from "@/lib/onboarding/subscription-gate";
import { avisoSuscripcion } from "@/lib/onboarding/trial";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

function formatARS(centavos: number | null): string
{
  return `$ ${(centavos ?? 0).toLocaleString("es-AR")}`;
}

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

  if (subscription === "blocked")
  {
    redirect("/pricing?blocked=1");
  }

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
    aviso !== null ? { texto: aviso, href: "/dashboard/facturacion", cta: "Ver facturación" } : null,
    avisarMp
      ? {
        texto: "Tenés servicios con seña pero sin MercadoPago conectado: las reservas quedan pendientes sin link de pago.",
        href: "/dashboard/config",
        cta: "Conectar MercadoPago",
      }
      : null,
    (() =>
    {
      const pendientesRecuperar = candidatosDesdeDashboard(dashboard).length;

      if (pendientesRecuperar === 0)
      {
        return null;
      }

      return {
        texto: pendientesRecuperar === 1
          ? "Tenés 1 cliente para recuperar."
          : `Tenés ${pendientesRecuperar} clientes para recuperar.`,
        href: "/dashboard/recuperar",
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
      tinta: "bg-violet-500/20 text-violet-300",
    },
    {
      etiqueta: "Pendientes",
      valor: String(stats.pendientes),
      detalle: "Esperando seña",
      Icono: TriangleAlert,
      tinta: "bg-amber-500/20 text-amber-300",
    },
    {
      etiqueta: "Señas cobradas",
      valor: String(stats.pagados),
      detalle: `${stats.confirmados} confirmados sin seña`,
      Icono: BadgeCheck,
      tinta: "bg-green-500/20 text-green-300",
    },
    {
      etiqueta: "Ingresos por señas",
      valor: formatARS(stats.totalIngresos),
      detalle: "Acumulado cobrado",
      Icono: CircleDollarSign,
      tinta: "bg-cyan-500/20 text-cyan-300",
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
      {avisos.length > 0 ? (
        <div className="space-y-2 mb-6" role="status">
          {avisos.map((a) => (
            <p key={a.cta} className="text-[13px] font-semibold px-3 py-2.5 rounded-xl border
              bg-amber-500/10 text-amber-300 border-amber-500/30">
              {a.texto}{" "}
              <Link href={a.href} className="underline">{a.cta}</Link>
            </p>
          ))}
        </div>
      ) : null}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          {String(dashboard.negocio.nombre ?? t("appName"))}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Agenda, equipo, servicios y cobros en un solo lugar.</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {indicadores.map(({ etiqueta, valor, detalle, Icono, tinta }) => (
          <div key={etiqueta} className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tinta}`}>
                <Icono className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{etiqueta}</p>
            </div>
            <p className="mt-3 text-[28px] leading-8 font-bold tracking-tight text-slate-100 tabular-nums">{valor}</p>
            <p className="mt-1 text-xs text-slate-400">{detalle}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <section aria-label="Próximos turnos" className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-100">Próximos turnos</h2>
            <Link href="/dashboard/agenda" className="text-sm font-semibold text-violet-300 hover:underline">
              Ver agenda
            </Link>
          </div>
          {proximos.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no tenés turnos. Compartí tu link público para recibir reservas.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {proximos.map((turno) => (
                <li key={turno.id} className="flex items-center gap-3 py-3 min-h-[64px]">
                  <div className="w-16 shrink-0 font-mono text-[13px] font-semibold text-slate-400 tabular-nums">
                    {typeof turno.inicio === "string" ? formatearEnZona(turno.inicio, timeZone) : "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {nombrePorCliente.get(turno.cliente_id) ?? "Cliente"}
                    </p>
                    <p className="truncate text-[13px] text-slate-400">
                      <span>{nombrePorServicio.get(turno.servicio_id) ?? "Servicio"}</span>
                      {typeof turno.staff_id === "string" && nombrePorStaff.get(turno.staff_id) !== undefined
                        ? ` · ${nombrePorStaff.get(turno.staff_id)}`
                        : ""}
                      <span>{` · ${formatARS(turno.monto_total)}`}</span>
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${claseBadgePara(turno.estado)}`}>
                    {etiquetaEstadoPara(turno.estado)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside aria-label="Resumen de hoy" className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6">
          <h2 className="text-base font-semibold text-slate-100 mb-1">Hoy</h2>
          <p className="text-[13px] text-slate-400 mb-4">Tu día de un vistazo.</p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Turnos</dt>
              <dd className="font-bold text-slate-100 tabular-nums">{stats.turnosHoy}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Señas de hoy</dt>
              <dd className="font-bold text-slate-100 tabular-nums">{stats.pagados}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Ingresos</dt>
              <dd className="font-bold text-slate-100 tabular-nums">{formatARS(stats.totalIngresos)}</dd>
            </div>
          </dl>
          <Link
            href="/dashboard/agenda"
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white
              px-4 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Abrir agenda de hoy
          </Link>
        </aside>
      </div>
    </div>
  );
}
