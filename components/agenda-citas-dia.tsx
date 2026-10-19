"use client";

import { useMemo, useState } from "react";

import StatusBadge from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/use-toast";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { formatearARS } from "@/lib/dashboard/moneda";
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
 * Filtra por día civil en la zona del negocio y ordena por `inicio`.
 * Las acciones mutan estado vía la Server Action recibida por props y
 * muestran feedback animado (toast + pulso o shake).
 *
 * @return Tarjeta con las citas del día y sus acciones.
 */
export default function AgendaCitasDia(props: AgendaCitasDiaProps)
{
  const [pendiente, setPendiente] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const { showToast } = useToast();

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

  async function cambiar(cita: CitaDia, nuevo: EstadoTurno): Promise<void>
  {
    if (pendiente)
    {
      return;
    }

    setPendiente(true);

    try
    {
      await props.onCambiarEstado(cita.id, nuevo);
      setFlashId(cita.id);
      setErrorId(null);
      showToast({
        tone: "success",
        title: "Turno actualizado",
        message: `${cita.cliente} · ${etiquetaEstadoPara(nuevo)}`,
      });
      setTimeout(() => setFlashId(null), 800);
    }
    catch (error)
    {
      const mensaje = error instanceof Error && error.message.length > 0
        ? error.message
        : "No pudimos actualizar el turno. Probá de nuevo.";

      setErrorId(cita.id);
      showToast({ tone: "error", title: "No se pudo actualizar", message: mensaje });
      setTimeout(() => setErrorId(null), 400);
    }
    finally
    {
      setPendiente(false);
    }
  }

  return (
    <section className="ui-card">
      <div className="p-5 sm:p-6">
        <h2 className="ui-section-title">Citas del día seleccionado</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          {`Turnos del día ${etiquetaDia(props.diaClave)} en orden por horario`}
        </p>
        <div className="space-y-3">
          {delDia.map((cita) =>
          {
            const ocupada = pendiente;
            const animacion = flashId === cita.id
              ? "animate-row-flash"
              : errorId === cita.id
                ? "animate-shake"
                : "";

            return (
              <article
                key={cita.id}
                data-testid="cita-dia"
                className={`rounded-lg border border-line bg-white p-4 transition-shadow duration-200
                  hover:shadow-[var(--shadow-card)] ${animacion}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-bold text-ink">{cita.cliente}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <strong className="font-semibold text-navy">
                        {horaCorta(cita.inicio, props.timeZone)}
                      </strong>
                      {` · ${cita.servicio}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{cita.profesional}</p>
                    {cita.sena_monto !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {`Seña ${formatearARS(cita.sena_monto)}`}
                        {cita.sena_porcentaje !== null ? ` (${cita.sena_porcentaje}%)` : ""}
                        {cita.sena_reembolsada === true ? " · Devuelta" : ""}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge estado={cita.estado} className="shrink-0" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cita.estado === "pendiente" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { void cambiar(cita, "pagado"); }}
                        disabled={ocupada}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        Marcar seña pagada
                      </button>
                      <button
                        type="button"
                        onClick={() => { void cambiar(cita, "cancelado"); }}
                        disabled={ocupada}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : null}
                  {cita.estado === "pagado" || cita.estado === "confirmado" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { void cambiar(cita, "completado"); }}
                        disabled={ocupada}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        Completar
                      </button>
                      <button
                        type="button"
                        onClick={() => { void cambiar(cita, "ausente"); }}
                        disabled={ocupada}
                        className="ui-btn ui-btn-danger ui-btn-sm"
                      >
                        Ausente
                      </button>
                      <button
                        type="button"
                        onClick={() => { void cambiar(cita, "cancelado"); }}
                        disabled={ocupada}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : null}
                  {cita.whatsappHref !== null ? (
                    <a
                      href={cita.whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                        hover:bg-success-soft"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
          {delDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas este día.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
