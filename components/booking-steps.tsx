"use client";

import { formatearARS } from "@/lib/dashboard/moneda";
import { formatearDiaLargoYMes } from "@/lib/format/fecha";
import type { DiaDisponible } from "@/lib/booking/slots";
import type { PortalServicio, PortalStaff } from "@/lib/portal/demo-business";
import { tieneSenaEfectiva } from "@/lib/reservas/montos";

interface PasoProfesionalProps
{
  readonly staff: readonly PortalStaff[];
  readonly staffId: string | null;
  readonly onElegir: (id: string) => void;
}

/**
 * Renderiza el paso 1: selección del profesional.
 *
 * @param props Profesionales disponibles y selección actual.
 * @return Sección con las tarjetas de profesionales.
 */
export function PasoProfesional({ staff, staffId, onElegir }: PasoProfesionalProps)
{
  return (
    <section className="animate-fade-up space-y-3">
      <h2 className="ui-section-title">1. Elegí tu profesional</h2>
      <div className="grid grid-cols-2 gap-3">
        {staff.filter((s) => s.activo !== false).map((s) => (
          <button
            key={s.id}
            onClick={() => onElegir(s.id)}
            aria-label={s.nombre}
            className={`rounded-lg border bg-white p-4 text-left transition-all duration-200 ${
              s.id === staffId
                ? "border-primary bg-info-soft shadow-sm"
                : "border-line hover:border-primary/40 hover:bg-surface"
            }`}
          >
            <div className="flex items-center gap-3">
              {s.fotoUrl != null && s.fotoUrl.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.fotoUrl} alt={s.nombre} className="size-12 rounded-full object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-info-soft
                  font-heading font-bold text-primary">{s.nombre.charAt(0)}</span>
              )}
              <span className="font-semibold text-navy">{s.nombre}</span>
            </div>
            {s.descripcion != null && s.descripcion.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{s.descripcion}</p>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

interface PasoServicioProps
{
  readonly profesional: PortalStaff;
  readonly servicios: readonly PortalServicio[];
  readonly servicioId: string | null;
  readonly onElegir: (id: string) => void;
}

/**
 * Renderiza el paso 2: selección del servicio del profesional elegido.
 *
 * @param props Profesional, servicios disponibles y selección actual.
 * @return Sección con las tarjetas de servicios.
 */
export function PasoServicio({ profesional, servicios, servicioId, onElegir }: PasoServicioProps)
{
  return (
    <section className="animate-fade-up space-y-3">
      <h2 className="ui-section-title">2. Elegí tu servicio</h2>
      {servicios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {profesional.nombre} todavía no tiene servicios asignados. Probá con otro profesional.
        </p>
      ) : null}
      <div className="space-y-2">
        {servicios.map((s) => (
          <button
            key={s.id}
            onClick={() => onElegir(s.id)}
            className={`w-full rounded-lg border bg-white p-4 text-left transition-all duration-200 ${
              s.id === servicioId
                ? "border-primary bg-info-soft shadow-sm"
                : "border-line hover:border-primary/40 hover:bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-navy">{s.nombre}</div>
              <div className="text-sm">
                {s.precioPromocional !== null ? (
                  <>
                    <span className="text-muted-foreground line-through mr-2">{formatearARS(s.precioBase)}</span>
                    <span className="font-bold text-[#0c6b45]">{formatearARS(s.precioPromocional)}</span>
                  </>
                ) : (
                  <span className="font-bold text-navy">{formatearARS(s.precioBase)}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {s.duracionMin} min{tieneSenaEfectiva(s.senaRequerida, s.senaPorcentaje)
                ? ` · Seña ${s.senaPorcentaje}%` : " · Sin seña"}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

interface PasoHorarioProps
{
  readonly dias: readonly DiaDisponible[];
  readonly diaISO: string | null;
  readonly slotISO: string | null;
  readonly elegirDia: (iso: string) => void;
  readonly elegirHora: (iso: string) => void;
  readonly volverADias: () => void;
}

/**
 * Renderiza el paso 3: selección de día y horario.
 *
 * @param props Días disponibles, selección actual y acciones de elección.
 * @return Sección con el selector de día u hora según el estado.
 */
export function PasoHorario(props: PasoHorarioProps)
{
  const titulo = <h2 className="ui-section-title">3. Elegí el horario</h2>;

  if (props.dias.length === 0)
  {
    return (
      <section className="animate-fade-up space-y-3">
        {titulo}
        <p className="text-sm text-muted-foreground">
          Sin horarios libres los próximos 7 días. Probá con otro profesional.
        </p>
      </section>
    );
  }

  if (props.diaISO === null)
  {
    return (
      <section className="animate-fade-up space-y-3">
        {titulo}
        <div className="space-y-3">
          <p className="text-sm text-ink font-medium">Elegí el día</p>
          <div className="grid grid-cols-1 gap-2">
            {props.dias.map((dia) => (
              <button
                key={dia.date.toISOString()}
                onClick={() => props.elegirDia(dia.date.toISOString())}
                aria-label={`Elegir día ${formatearDiaLargoYMes(dia.date)}`}
                className="min-h-14 w-full rounded-lg border border-line bg-white px-4 py-3 text-left
                  transition-all duration-200 hover:border-primary/50 hover:bg-surface"
              >
                <span className="block font-semibold text-navy capitalize">
                  {formatearDiaLargoYMes(dia.date)}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {dia.starts.length === 1 ? "1 horario libre" : `${dia.starts.length} horarios libres`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const diaElegido = props.dias.find((dia) => dia.date.toISOString() === props.diaISO);

  return (
    <section className="space-y-3">
      {titulo}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink font-medium">
            Elegí la hora del{" "}
            <span className="font-semibold text-navy capitalize">
              {diaElegido !== undefined ? formatearDiaLargoYMes(diaElegido.date) : ""}
            </span>
          </p>
          <button
            onClick={props.volverADias}
            className="min-h-11 px-2 text-xs font-semibold text-primary underline underline-offset-4
              hover:text-navy"
          >
            Cambiar día
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(diaElegido?.starts ?? []).map((start) => (
            <button
              key={start.toISOString()}
              onClick={() => props.elegirHora(start.toISOString())}
              aria-pressed={props.slotISO === start.toISOString()}
              className={`min-h-14 rounded-lg border px-2 py-3 text-base font-bold tabular-nums
                transition-all duration-200 ${
                  props.slotISO === start.toISOString()
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-line bg-white text-navy hover:border-primary/50 hover:bg-soft"
                }`}
            >
              {`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
