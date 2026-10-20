import Link from "next/link";

import { actualizarEstadoTurno } from "./actions";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import AgendaCalendar from "@/components/agenda-calendar";
import PageHeader from "@/components/ui/page-header";
import type { CitaDia } from "@/components/agenda-citas-dia";
import { construirLinkCancelacion, firmarTokenCancelacion } from "@/lib/cancelacion/token";
import { getDashboardData } from "@/lib/dashboard/queries";
import { readEnv } from "@/lib/env/env";
import { linkWhatsapp } from "@/lib/notifications/whatsapp";
import { textoWhatsapp } from "@/lib/notifications/custom-templates";
import { calendarService } from "@/lib/services/calendar";
import { claveDiaEnZona, formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

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
  readonly sena_reembolsada?: boolean | null;
}

function formatearInicio(iso: string, timeZone: string): string
{
  return formatearEnZona(iso, timeZone);
}

async function cambiarEstado(turnoId: string, nuevo: EstadoTurno): Promise<void>
{
  "use server";

  await actualizarEstadoTurno(turnoId, nuevo);
}

export default async function AgendaPage(props?: {
  readonly searchParams?: Promise<{ vista?: string; fecha?: string }>;
})
{
  const params = props?.searchParams === undefined ? undefined : await props.searchParams;
  const { data: dashboard, isDemo } = await getDashboardData();
  const staff = dashboard.staff as StaffRow[];
  const negocioRow = dashboard.negocio as {
    id?: unknown; nombre?: unknown; timezone?: unknown; pais?: unknown; horarios?: unknown;
    msg_recordatorio_subject?: unknown; msg_recordatorio_cuerpo?: unknown;
    msg_resena_subject?: unknown; msg_resena_cuerpo?: unknown;
  };
  const negocioNombre = typeof negocioRow.nombre === "string" ? negocioRow.nombre : "tu negocio";
  const timeZone = resolverTimezoneNegocio({ timezone: negocioRow.timezone, pais: negocioRow.pais });
  const horariosNegocio = typeof negocioRow.horarios === "object" && negocioRow.horarios !== null
    ? negocioRow.horarios as Record<string, unknown>
    : {};
  const base = readEnv("NEXT_PUBLIC_APP_URL")
    ?? (readEnv("VERCEL_URL") !== null ? `https://${readEnv("VERCEL_URL") as string}` : null);
  const turnos = (dashboard.turnos as TurnoRow[]).slice().sort((a, b) =>
    new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const duracionPorServicio = new Map((dashboard.servicios as Array<{ id: string; duracion_min: number }>)
    .map((s) => [s.id, s.duracion_min]));
  const nombrePorServicio = new Map((dashboard.servicios as Array<{ id: string; nombre: string }>)
    .map((s) => [s.id, s.nombre]));
  const nombrePorStaff = new Map((staff as StaffRow[]).map((s) => [s.id, s.nombre]));
  const nombrePorCliente = new Map((dashboard.clientes as Array<{ id: string; nombre: string }>)
    .map((c) => [c.id, c.nombre]));
  const whatsappPorCliente = new Map(
    (dashboard.clientes as Array<{ id: string; whatsapp: string }>).map((c) => [c.id, c.whatsapp]));

  /** Link wa.me de refuerzo manual (recordatorio o reseña según estado). */
  function linkRefuerzo(turno: TurnoRow): string | null
  {
    const whatsapp = whatsappPorCliente.get(turno.cliente_id);

    if (whatsapp === undefined)
    {
      return null;
    }

    const datos = {
      cliente: nombrePorCliente.get(turno.cliente_id) ?? "Cliente",
      negocio: negocioNombre,
      servicio: nombrePorServicio.get(turno.servicio_id) ?? "tu servicio",
      profesional: nombrePorStaff.get(turno.staff_id) ?? "tu profesional",
      fecha: formatearInicio(turno.inicio, timeZone),
    };

    if (turno.estado === "pagado" || turno.estado === "confirmado")
    {
      const secreto = readEnv("CANCELACION_SECRET");
      let cancelacionUrl = "";

      if (base !== null && secreto !== null && secreto.trim().length >= 16)
      {
        const inicio = new Date(turno.inicio);
        const token = firmarTokenCancelacion({
          turnoId: turno.id,
          clienteId: turno.cliente_id,
          inicio,
        }, secreto);

        cancelacionUrl = construirLinkCancelacion(stripTrailingSlashes(base), turno.id, token);
      }

      return linkWhatsapp(whatsapp, textoWhatsapp("recordatorio", {
        subject: typeof negocioRow.msg_recordatorio_subject === "string"
          ? negocioRow.msg_recordatorio_subject
          : null,
        cuerpo: typeof negocioRow.msg_recordatorio_cuerpo === "string"
          ? negocioRow.msg_recordatorio_cuerpo
          : null,
      }, datos, { cancelacion: cancelacionUrl }));
    }

    if (turno.estado === "completado" && base !== null)
    {
      return linkWhatsapp(whatsapp, textoWhatsapp("resena", {
        subject: typeof negocioRow.msg_resena_subject === "string" ? negocioRow.msg_resena_subject : null,
        cuerpo: typeof negocioRow.msg_resena_cuerpo === "string" ? negocioRow.msg_resena_cuerpo : null,
      }, datos, { resena: `${base}/resena/${turno.id}` }));
    }

    return null;
  }

  const hoy = new Date();
  const negocioIdCrudo = (dashboard.negocio as { id?: unknown }).id;
  const negocioIdTexto = typeof negocioIdCrudo === "string" ? negocioIdCrudo : "";
  const externos = isDemo
    ? []
    : await calendarService.getExternalEventsForNegocio(
      negocioIdTexto,
      new Date(hoy.getTime() - 30 * 86_400_000), new Date(hoy.getTime() + 60 * 86_400_000))
      .then((eventos) => eventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        inicio: e.inicio.toISOString(),
        fin: e.fin.toISOString(),
      })))
      .catch(() => []);

  // Solo confirmado/pagado impactan el calendario semanal.
  // El pendiente con seña no va a grilla ni a GCal hasta acreditarse.
  const turnosGrilla = turnos.filter((t) => t.estado !== "pendiente").map((t) =>
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

  // Detalle completo para las citas del día seleccionado (todos los estados,
  // orden por horario lo resuelve el componente cliente).
  const citas: CitaDia[] = turnos.map((t) => ({
    id: t.id,
    staffId: t.staff_id,
    inicio: t.inicio,
    estado: t.estado,
    cliente: nombrePorCliente.get(t.cliente_id) ?? "Cliente",
    servicio: nombrePorServicio.get(t.servicio_id) ?? "Servicio",
    profesional: nombrePorStaff.get(t.staff_id) ?? "Profesional",
    sena_monto: t.sena_monto,
    sena_porcentaje: t.sena_porcentaje,
    sena_reembolsada: t.sena_reembolsada ?? null,
    whatsappHref: linkRefuerzo(t),
  }));

  const fechaParaNuevo = typeof params?.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha)
    ? params.fecha
    : claveDiaEnZona(new Date(), timeZone);

  return (
    <div className="space-y-4 sm:space-y-6">
    <PageHeader
      title="Agenda"
      subtitle="Organizá tus turnos por día, semana o mes y actualizá el estado en un clic."
      actionsBelow={(
        <Link
          href={`/dashboard/agenda/nuevo?fecha=${fechaParaNuevo}`}
          className="ui-btn ui-btn-primary"
        >
          Agregar turno
        </Link>
      )}
    />
    <AgendaCalendar
      base={hoy.toISOString()}
      timeZone={timeZone}
      staff={staff.map((s) => ({ id: s.id, nombre: s.nombre }))}
      turnos={turnosGrilla}
      externos={externos}
      citas={citas}
      onCambiarEstado={cambiarEstado}
      vistaInicial={params?.vista}
      fechaInicial={params?.fecha}
      horariosNegocio={horariosNegocio}
    />
    </div>
  );
}
