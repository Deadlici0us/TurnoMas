"use client";

import { useMemo } from "react";

import type { EstadoTurno } from "@/lib/dashboard/estados";
import { ESTADO_BADGE, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { claveDiaEnZona, obtenerPartesCiviles } from "@/lib/timezone/timezone";

export interface CitaDia
{
  readonly id: string;
  readonly staffId: string;
  readonly inicio: string;
  readonly estado: EstadoTurno;
  readonly cliente: string;
  readonly servicio: string;
  readonly profesional: string;
  readonly sena_monto: number | null;
  readonly sena_porcentaje: number | null;
  readonly sena_reembolsada?: boolean | null;
  readonly whatsappHref: string | null;
}

interface AgendaCitasDiaProps
{
  readonly timeZone: string;
  readonly diaClave: string;
  readonly citas: readonly CitaDia[];
  readonly onCambiarEstado: (turnoId: string, nuevo: EstadoTurno) => Promise<void>;
}

/**
 * Hora civil `HH:mm` de un inicio en la zona del negocio.
 *
 * @param inicio Instante ISO del turno.
 * @param timeZone Zona IANA del negocio.
 * @return Horario `HH:mm` o el raw si es inválido.
 */
function horaCorta(inicio: string, timeZone: string): string
{
  const fecha = new Date(inicio);

  if (Number.isNaN(fecha.getTime()))
  {
    return inicio;
  }

  const partes = obtenerPartesCiviles(fecha, timeZone);
  const dos = (n: number): string => String(n).padStart(2, "0");

  return `${dos(partes.hora)}:${dos(partes.minuto)}`;
}

/**
 * Etiqueta `DD/MM/YYYY` de una clave `YYYY-MM-DD`.
 *
 * @param diaClave Clave del día seleccionado.
 * @return Fecha corta o la clave si no parsea.
 */
function etiquetaDia(diaClave: string): string
{
  const partes = diaClave.split("-");

  if (partes.length !== 3)
  {
    return diaClave;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Citas del día seleccionado en orden por horario.
 *
 * Reemplaza la lista agrupada por profesional: filtra por día civil en
 * la zona del negocio (respeta el filtro de profesional ya aplicado por
 * el padre) y ordena por `inicio` ascendente. Las acciones mutan estado
 * vía la Server Action recibida por props.
 *
 * @return Tarjeta con las citas del día y sus acciones.
 */
export default function AgendaCitasDia(props: AgendaCitasDiaProps)
{
  const delDia = useMemo(() =>
  {
    return props.citas
      .filter((c) =>
      {
        const inicio = new Date(c.inicio);

        return !Number.isNaN(inicio.getTime()) && claveDiaEnZona(inicio, props.timeZone) === props.diaClave;
      })
      .slice()
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [props.citas, props.diaClave, props.timeZone]);

  return (
    <section className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100 mb-1">Agenda</h1>
      <p className="text-sm text-slate-400 mb-4">
        {`Turnos del día ${etiquetaDia(props.diaClave)} en orden por horario`}
      </p>
      <h2 className="font-semibold text-slate-100 mb-3">Citas del día seleccionado</h2>
      <div className="space-y-3">
        {delDia.map((cita) => (
          <div key={cita.id} data-testid="cita-dia" className="p-4 border border-white/10 rounded-xl bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-100">{cita.cliente}</h3>
                <p className="text-sm text-slate-400">
                  {`${horaCorta(cita.inicio, props.timeZone)} · ${cita.servicio}`}
                </p>
                <p className="text-xs text-slate-400 mt-1">{cita.profesional}</p>
                {cita.sena_monto !== null ? (
                  <p className="text-xs text-slate-400 mt-1">
                    {`Seña $${cita.sena_monto.toLocaleString("es-AR")}`}
                    {cita.sena_porcentaje !== null ? ` (${cita.sena_porcentaje}%)` : ""}
                    {cita.sena_reembolsada === true ? " · Devuelta" : ""}
                  </p>
                ) : null}
              </div>
              <span
                className={"shrink-0 text-xs font-semibold px-3 py-1 rounded-full border "
                  + ESTADO_BADGE[cita.estado]}
              >
                {etiquetaEstadoPara(cita.estado)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {cita.estado === "pendiente" ? (
                <>
                  <form action={() => props.onCambiarEstado(cita.id, "pagado")}>
                    <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600
                      text-white hover:bg-green-700">
                      Marcar seña pagada
                    </button>
                  </form>
                  <form action={() => props.onCambiarEstado(cita.id, "cancelado")}>
                    <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                      border-white/15 hover:bg-white/10">
                      Cancelar
                    </button>
                  </form>
                </>
              ) : null}
              {cita.estado === "pagado" || cita.estado === "confirmado" ? (
                <>
                  <form action={() => props.onCambiarEstado(cita.id, "completado")}>
                    <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600
                      text-white hover:bg-blue-700">
                      Completar
                    </button>
                  </form>
                  <form action={() => props.onCambiarEstado(cita.id, "ausente")}>
                    <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600
                      text-white hover:bg-red-700">
                      Ausente
                    </button>
                  </form>
                  <form action={() => props.onCambiarEstado(cita.id, "cancelado")}>
                    <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                      border-white/15 hover:bg-white/10">
                      Cancelar
                    </button>
                  </form>
                </>
              ) : null}
              {cita.whatsappHref !== null ? (
                <a
                  href={cita.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                    border-green-500/40 text-green-300 hover:bg-green-500/20"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ))}
        {delDia.length === 0 ? (
          <p className="text-sm text-slate-400">Sin citas este día.</p>
        ) : null}
      </div>
    </section>
  );
}
