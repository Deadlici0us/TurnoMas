"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import LeyendaEstados from "@/components/leyenda-estados";
import AgendaCitasDia, { type CitaDia } from "@/components/agenda-citas-dia";
import type { ActionResult } from "@/lib/actions/action-result";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { claseBadgePara, claseGrillaPara, EXTERNO_LEYENDA } from "@/lib/dashboard/estados-colores";
import
{
  type VistaAgenda,
  VISTAS_AGENDA,
  claveDeBase,
  diasDeMes,
  diasDeSemana,
  diaEnCurso,
  moverBase,
  normalizarVista,
  resolverVistaAgenda,
} from "@/lib/agenda/navegacion";
import { asignarCarriles } from "@/lib/agenda/solapamientos";
import { resolverBaseHorarioNegocio } from "@/lib/agenda/horario-rango";
import
{
  type DiaCivil,
  claveDeDiaCivil,
  claveDiaEnZona,
  formatearHoraEnZona,
  minutosEnZona,
} from "@/lib/timezone/timezone";

export interface CalendarTurno
{
  readonly id: string;
  readonly staffId: string;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: string;
  readonly titulo: string;
  readonly profesional: string;
}

export interface CalendarExterno
{
  readonly id: string;
  readonly titulo: string;
  readonly inicio: string;
  readonly fin: string;
}

interface BloqueDia
{
  readonly key: string;
  readonly top: number;
  readonly height: number;
  readonly clase: string;
  readonly titulo: string;
  readonly hora: string | null;
  readonly profesional: string | null;
}

interface DetalleBloque
{
  readonly hora: string;
  readonly profesional: string;
}

interface BloqueDiaConCarril extends BloqueDia
{
  readonly carril: number;
  readonly carriles: number;
}

interface RangoHoras
{
  readonly horaDesde: number;
  readonly horaHasta: number;
  readonly cerrado: boolean;
}

interface AgendaCalendarProps
{
  readonly base: string;
  readonly timeZone: string;
  readonly staff: ReadonlyArray<{ readonly id: string; readonly nombre: string }>;
  readonly turnos: readonly CalendarTurno[];
  readonly externos: readonly CalendarExterno[];
  readonly citas: readonly CitaDia[];
  readonly onCambiarEstado: (turnoId: string, nuevo: EstadoTurno) => Promise<ActionResult<void> | void>;
  readonly vistaInicial?: unknown;
  readonly fechaInicial?: unknown;
  readonly horariosNegocio?: Record<string, unknown>;
}

const HORA_DESDE_DEFECTO = 8;
const HORA_HASTA_DEFECTO = 20;
const PX_POR_HORA_DIA = 60;
const HUECO_BLOQUES_PX = 2;
const NOMBRES_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const NOMBRES_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ETIQUETA_VISTA: Record<VistaAgenda, string> = { dia: "Día", semana: "Semana", mes: "Mes" };

function etiquetaDiaCorta(dia: DiaCivil): { readonly semana: string; readonly numero: string; readonly fecha: string }
{
  const base = new Date(Date.UTC(dia.anio, dia.mes - 1, dia.dia));
  const weekday = base.getUTCDay();
  const dos = (n: number): string => String(n).padStart(2, "0");

  return {
    semana: NOMBRES_DIA[weekday] ?? "",
    numero: String(dia.dia),
    fecha: `${dos(dia.dia)}/${dos(dia.mes)}`,
  };
}

/**
 * Clase del encabezado de un día en la vista semana.
 *
 * @param esHoy Columna del día en curso.
 * @return Clases del encabezado.
 */
function claseEncabezadoSemana(esHoy: boolean): string
{
  const base = "px-2 py-2 text-center";

  return esHoy ? `${base} bg-info-soft` : `${base} bg-surface`;
}

/**
 * Clase de la etiqueta de hora en la vista día: vive en la columna
 * horaria y, para la primera hora, queda debajo de su línea para que
 * el recorte redondeado no la corte por arriba.
 *
 * @param esPrimera Primera hora del rango visible.
 * @return Clases de la etiqueta.
 */
function claseEtiquetaHora(esPrimera: boolean): string
{
  const base = "absolute left-1 font-mono text-muted-foreground tabular-nums";

  return esPrimera ? `${base} top-0 text-[11px]` : `${base} -top-2 text-[11px]`;
}

/**
 * Posición horizontal de un bloque según su carril.
 *
 * @param bloque Bloque con carril y total de carriles.
 * @return Estilo absoluto con separación entre bloques vecinos.
 */
function estiloBloque(bloque: BloqueDiaConCarril): CSSProperties
{
  const anchoCarril = 100 / bloque.carriles;

  return {
    top: bloque.top,
    height: bloque.height,
    left: `calc(${bloque.carril * anchoCarril}% + ${HUECO_BLOQUES_PX}px)`,
    width: "fit-content",
    maxWidth: `calc(${anchoCarril}% - ${HUECO_BLOQUES_PX * 2}px)`,
  };
}

/**
 * Texto completo de un bloque para tooltip y vista semana.
 *
 * @param bloque Bloque con sus datos visibles.
 * @return Título con horario y profesional cuando corresponde.
 */
function textoCompletoBloque(bloque: BloqueDia): string
{
  if (bloque.hora === null || bloque.profesional === null)
  {
    return bloque.titulo;
  }

  return `${bloque.titulo} · ${bloque.hora} · ${bloque.profesional}`;
}

function etiquetaRango(vista: VistaAgenda, dias: readonly DiaCivil[], base: DiaCivil): string
{
  if (dias.length === 0)
  {
    return "";
  }

  const primero = dias[0] as DiaCivil;
  const ultimo = dias.at(-1) as DiaCivil;

  if (vista === "mes")
  {
    return `${NOMBRES_MES[base.mes - 1]} ${base.anio}`;
  }

  if (vista === "dia")
  {
    return `${etiquetaDiaCorta(primero).semana} ${etiquetaDiaCorta(primero).fecha}`;
  }

  return `${etiquetaDiaCorta(primero).fecha} – ${etiquetaDiaCorta(ultimo).fecha}`;
}

/**
 * Renderiza la vista de un día: encabezado, grilla horaria y bloques.
 *
 * @param props Día base, claves, horas, rango, alto y bloques calculados.
 * @return Grilla del día seleccionado.
 */
function renderVistaDia(props: {
  readonly base: DiaCivil;
  readonly claveHoy: string;
  readonly horas: readonly number[];
  readonly rango: RangoHoras;
  readonly altoDia: number;
  readonly bloques: readonly BloqueDiaConCarril[];
})
{
  const esHoy = claveDeBase(props.base) === props.claveHoy;

  return (
    <div className="grid grid-cols-[56px_1fr] gap-px overflow-hidden rounded-lg border border-line bg-line">
      <div className="bg-surface" />
      <div className="bg-surface px-2 py-2 text-center">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase">
          {etiquetaDiaCorta(props.base).semana}
        </div>
        <div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
          ${esHoy ? "bg-primary text-white" : "text-navy"}`}>
          {etiquetaDiaCorta(props.base).numero}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
          {esHoy ? "Hoy" : etiquetaDiaCorta(props.base).fecha}
        </div>
      </div>
      <div
        className="relative bg-surface"
        style={{ height: props.altoDia }}
        data-testid="agenda-horas-dia"
      >
        {props.horas.map((h, indice) => (
          <div
            key={h}
            className="absolute inset-x-0"
            style={{ top: (h - props.rango.horaDesde) * PX_POR_HORA_DIA }}
          >
            <span className={claseEtiquetaHora(indice === 0)}>
              {`${String(h).padStart(2, "0")}:00`}
            </span>
          </div>
        ))}
      </div>
      <div
        className="relative bg-white"
        style={{ height: props.altoDia }}
        data-testid="agenda-grilla-dia"
      >
        {props.horas.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-line"
            style={{ top: (h - props.rango.horaDesde) * PX_POR_HORA_DIA }}
          />
        ))}
        {props.bloques.map((b) => (
          <div
            key={b.key}
            title={textoCompletoBloque(b)}
            className={`absolute overflow-hidden rounded-md border px-2 py-px text-[11px] leading-[12px]
              font-semibold shadow-sm transition-all duration-200 hover:-translate-y-px
              hover:shadow-md ${b.clase}`}
            style={estiloBloque(b)}
          >
            <span className="block truncate">{b.titulo}</span>
            {b.hora !== null && b.profesional !== null ? (
              <span className="block truncate text-[10px] leading-[11px] font-medium opacity-80">
                {`${b.hora} · ${b.profesional}`}
              </span>
            ) : null}
          </div>
        ))}
        {props.bloques.length === 0 ? (
          <p className="absolute inset-x-0 top-1/2 text-center text-sm text-muted-foreground">
            {props.rango.cerrado ? "Sin turnos este día · Cerrado." : "Sin turnos este día."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Calendario visual de la agenda con vistas día, semana y mes.
 *
 * Día en curso por defecto; navegación por día/semana/mes, selector
 * de fecha y filtro por profesional. Debajo del calendario muestra las
 * citas del día seleccionado en orden por horario (con sus acciones).
 * El contenedor se ajusta al tamaño del calendario (`h-auto`).
 *
 * @return Calendario con toolbar, vistas, leyenda y citas del día.
 */
export default function AgendaCalendar(props: AgendaCalendarProps)
{
  const inicial = useMemo(() =>
  {
    const ahora = new Date(props.base);

    return resolverVistaAgenda(
      { vista: props.vistaInicial, fecha: props.fechaInicial },
      Number.isNaN(ahora.getTime()) ? new Date() : ahora,
      props.timeZone,
    );
  }, [props.base, props.vistaInicial, props.fechaInicial, props.timeZone]);
  const [vista, setVista] = useState<VistaAgenda>(() => normalizarVista(inicial.vista));
  const [base, setBase] = useState<DiaCivil>(() => inicial.base);
  const [staffId, setStaffId] = useState<string | null>(
    props.staff.length === 1 ? props.staff[0]?.id ?? null : null,
  );
  const refRegionSemana = useRef<HTMLDivElement | null>(null);
  const hoyCivil = useMemo(() =>
  {
    const ahora = new Date(props.base);

    return diaEnCurso(Number.isNaN(ahora.getTime()) ? new Date() : ahora, props.timeZone);
  }, [props.base, props.timeZone]);
  const claveHoy = claveDeBase(hoyCivil);

  const dias = useMemo(() =>
  {
    if (vista === "dia")
    {
      return [base];
    }

    if (vista === "semana")
    {
      return diasDeSemana(base, props.timeZone);
    }

    return diasDeMes(base);
  }, [vista, base, props.timeZone]);

  useEffect(() =>
  {
    if (vista !== "semana")
    {
      return;
    }

    const region = refRegionSemana.current;

    if (region === null || region.scrollWidth <= region.clientWidth)
    {
      return;
    }

    const hoy = region.querySelector('[data-hoy="true"]');

    if (hoy instanceof HTMLElement)
    {
      const delta = hoy.getBoundingClientRect().left - region.getBoundingClientRect().left;

      region.scrollLeft += delta - 56;
    }
  }, [vista, dias]);

  const turnosFiltrados = staffId === null
    ? props.turnos
    : props.turnos.filter((t) => t.staffId === staffId);

  const citasFiltradas = staffId === null
    ? props.citas
    : props.citas.filter((c) => c.staffId === staffId);
  const diaSeleccionado = claveDeBase(base);

  const rango = useMemo(() =>
  {
    let diasParaBase: readonly DiaCivil[] = [];

    if (vista === "dia")
    {
      diasParaBase = [base];
    }
    else if (vista === "semana")
    {
      diasParaBase = dias;
    }

    const usaHorario = props.horariosNegocio !== undefined && diasParaBase.length > 0;
    const baseHorario = usaHorario
      ? resolverBaseHorarioNegocio(diasParaBase, props.horariosNegocio ?? {})
      : null;
    const baseDesde = baseHorario?.horaDesde ?? HORA_DESDE_DEFECTO;
    const baseHasta = baseHorario?.horaHasta ?? HORA_HASTA_DEFECTO;
    let min = baseDesde * 60;
    let max = baseHasta * 60;

    const considerar = (inicioIso: string, finIso: string): void =>
    {
      const inicio = new Date(inicioIso);
      const fin = new Date(finIso);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio)
      {
        return;
      }

      min = Math.min(min, minutosEnZona(inicio, props.timeZone));
      const mismoDia = claveDiaEnZona(inicio, props.timeZone) === claveDiaEnZona(fin, props.timeZone);

      max = Math.max(max, mismoDia ? minutosEnZona(fin, props.timeZone) : baseHasta * 60);
    };

    for (const t of turnosFiltrados)
    {
      considerar(t.inicio, t.fin);
    }

    for (const e of props.externos)
    {
      considerar(e.inicio, e.fin);
    }

    const horaDesde = Math.max(0, Math.min(baseDesde, Math.floor(min / 60)));
    const horaHasta = Math.min(24, Math.max(baseHasta, Math.ceil(max / 60)));

    return {
      horaDesde,
      horaHasta: Math.max(horaHasta, horaDesde + 4),
      cerrado: baseHorario !== null && !baseHorario.hayHorario,
    };
  }, [turnosFiltrados, props.externos, props.timeZone, props.horariosNegocio, vista, dias, base]);

  const horas = useMemo(
    () => Array.from({ length: rango.horaHasta - rango.horaDesde }, (_, i) => rango.horaDesde + i),
    [rango],
  );

  function reflejarUrl(vistaNueva: VistaAgenda, baseNueva: DiaCivil): void
  {
    if (typeof window === "undefined")
    {
      return;
    }

    window.history.replaceState(null, "", `?vista=${vistaNueva}&fecha=${claveDeBase(baseNueva)}`);
  }

  function cambiarVista(nueva: VistaAgenda): void
  {
    setVista(nueva);
    reflejarUrl(nueva, base);
  }

  function mover(direccion: 1 | -1): void
  {
    const siguiente = moverBase(base, vista, direccion);

    setBase(siguiente);
    reflejarUrl(vista, siguiente);
  }

  function irHoy(): void
  {
    setBase(hoyCivil);
    reflejarUrl(vista, hoyCivil);
  }

  function elegirFecha(valor: string): void
  {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor))
    {
      const [anio, mes, dia] = valor.split("-").map(Number) as [number, number, number];
      const siguiente = { anio, mes, dia };

      setBase(siguiente);
      reflejarUrl(vista, siguiente);
    }
  }

  function bloquesDelDia(diaKey: string): BloqueDiaConCarril[]
  {
    const salida: BloqueDia[] = [];
    const pxPorHora = vista === "dia" ? PX_POR_HORA_DIA : 44;

    const empujar = (
      key: string,
      inicioIso: string,
      finIso: string,
      clase: string,
      titulo: string,
      detalle?: DetalleBloque,
    ): void =>
    {
      const inicio = new Date(inicioIso);
      const fin = new Date(finIso);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio)
      {
        return;
      }

      const claveInicio = claveDiaEnZona(inicio, props.timeZone);
      const claveFin = claveDiaEnZona(fin, props.timeZone);

      if (diaKey < claveInicio || diaKey > claveFin)
      {
        return;
      }

      const desdeCivil = diaKey === claveInicio ? minutosEnZona(inicio, props.timeZone) : 0;
      const hastaCivil = diaKey === claveFin ? minutosEnZona(fin, props.timeZone) : 24 * 60;
      const desde = Math.max(desdeCivil, rango.horaDesde * 60);
      const hasta = Math.min(hastaCivil === 0 && diaKey === claveFin ? 24 * 60 : hastaCivil, rango.horaHasta * 60);

      if (hasta <= desde)
      {
        return;
      }

      salida.push(
      {
        key,
        top: ((desde - rango.horaDesde * 60) / 60) * pxPorHora,
        height: Math.max(((hasta - desde) / 60) * pxPorHora, vista === "dia" ? 28 : 18),
        clase,
        titulo,
        hora: detalle?.hora ?? null,
        profesional: detalle?.profesional ?? null,
      });
    };

    for (const t of turnosFiltrados)
    {
      const hora = formatearHoraEnZona(t.inicio, props.timeZone);

      empujar(`t-${t.id}`, t.inicio, t.fin, claseGrillaPara(t.estado), t.titulo, {
        hora,
        profesional: t.profesional,
      });
    }

    for (const e of props.externos)
    {
      empujar(`e-${e.id}`, e.inicio, e.fin, EXTERNO_LEYENDA.clase, `Google · ${e.titulo}`);
    }

    return asignarCarriles(salida.map((bloque) => ({
      ...bloque,
      inicio: bloque.top,
      fin: bloque.top + bloque.height,
    })));
  }

  function puntosDelDia(diaKey: string): Array<{ key: string; clase: string; titulo: string }>
  {
    const puntos: Array<{ key: string; clase: string; titulo: string }> = [];

    for (const t of turnosFiltrados)
    {
      const inicio = new Date(t.inicio);

      if (!Number.isNaN(inicio.getTime()) && claveDiaEnZona(inicio, props.timeZone) === diaKey)
      {
        puntos.push({ key: `t-${t.id}`, clase: claseBadgePara(t.estado), titulo: t.titulo });
      }
    }

    for (const e of props.externos)
    {
      const inicio = new Date(e.inicio);

      if (!Number.isNaN(inicio.getTime()) && claveDiaEnZona(inicio, props.timeZone) === diaKey)
      {
        puntos.push({ key: `e-${e.id}`, clase: EXTERNO_LEYENDA.clase, titulo: `Google · ${e.titulo}` });
      }
    }

    return puntos;
  }

  const etiquetaMovimiento = ETIQUETA_VISTA[vista];
  const altoDia = (rango.horaHasta - rango.horaDesde) * PX_POR_HORA_DIA;
  const altoSemana = (rango.horaHasta - rango.horaDesde) * 44;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="ui-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="ui-section-title">Calendario</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {`${etiquetaRango(vista, dias, base)} · ${props.timeZone}`}
            </p>
          </div>
          <fieldset className="m-0 flex flex-wrap items-center gap-1 border-0 p-0" aria-label="Vista de agenda">
            {VISTAS_AGENDA.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => cambiarVista(v)}
                aria-pressed={vista === v}
                className={`ui-tab ${vista === v ? "ui-tab-active" : ""}`}
              >
                {ETIQUETA_VISTA[v]}
              </button>
            ))}
          </fieldset>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label={`${etiquetaMovimiento} anterior`}
            className="ui-btn ui-btn-outline ui-btn-icon"
          >
            ←
          </button>
          <button type="button" onClick={irHoy} className="ui-btn ui-btn-outline ui-btn-sm">
            Hoy
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label={`${etiquetaMovimiento} siguiente`}
            className="ui-btn ui-btn-outline ui-btn-icon"
          >
            →
          </button>
          <input
            type="date"
            defaultValue={claveDeBase(base)}
            key={claveDeBase(base)}
            onChange={(e) => elegirFecha(e.target.value)}
            aria-label="Ir a fecha"
            className="ui-input ml-auto h-9 w-auto min-w-[150px]"
          />
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <LeyendaEstados incluirExterno />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setStaffId(null)}
              className={`ui-tab ${staffId === null ? "ui-tab-active" : ""}`}
            >
              Todos
            </button>
            {props.staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStaffId(s.id)}
                className={`ui-tab ${staffId === s.id ? "ui-tab-active" : ""}`}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
        <div key={`${vista}-${claveDeBase(base)}`} className="animate-fade-in">
          {vista === "dia"
            ? renderVistaDia({
                base,
                claveHoy,
                horas,
                rango,
                altoDia,
                bloques: bloquesDelDia(claveDeBase(base)),
              })
            : null}
          {vista === "semana" ? (
            <section
              ref={refRegionSemana}
              aria-label="Calendario semanal, deslizar horizontalmente para ver todos los días"
              data-testid="agenda-semana-scroll"
              className="overflow-x-auto"
            >
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px overflow-hidden rounded-lg
                  border border-line bg-line">
                  <div className="bg-surface" />
                  {dias.map((dia) =>
                  {
                    const esHoy = claveDeDiaCivil(dia) === claveHoy;

                    return (
                      <div
                        key={claveDeDiaCivil(dia)}
                        data-hoy={esHoy ? "true" : undefined}
                        className={claseEncabezadoSemana(esHoy)}
                      >
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                          {etiquetaDiaCorta(dia).semana}
                        </div>
                        <div className={`text-sm font-bold ${esHoy ? "text-primary" : "text-navy"}`}>
                          {etiquetaDiaCorta(dia).fecha}
                        </div>
                      </div>
                    );
                  })}
                  <div className="relative bg-surface" style={{ height: altoSemana }}>
                    {horas.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-line pl-1 font-mono
                          text-[11px] text-muted-foreground tabular-nums"
                        style={{ top: (h - rango.horaDesde) * 44 }}
                      >
                        {`${String(h).padStart(2, "0")}:00`}
                      </div>
                    ))}
                  </div>
                  {dias.map((dia) => (
                    <div
                      key={claveDeDiaCivil(dia)}
                      className={`relative ${claveDeDiaCivil(dia) === claveHoy ? "bg-info-soft" : "bg-white"}`}
                      style={{ height: altoSemana }}
                    >
                      {horas.map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-line"
                          style={{ top: (h - rango.horaDesde) * 44 }}
                        />
                      ))}
                      {bloquesDelDia(claveDeDiaCivil(dia)).map((b) => (
                        <div
                          key={b.key}
                          title={textoCompletoBloque(b)}
                          className={`absolute overflow-hidden rounded border px-1 py-0.5
                            text-[11px] leading-tight font-semibold shadow-sm transition-all
                            duration-200 hover:-translate-y-px hover:shadow-md ${b.clase}`}
                          style={estiloBloque(b)}
                        >
                          {textoCompletoBloque(b)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
          {vista === "mes" ? (
            <div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line">
                {NOMBRES_DIA.slice(1).concat(NOMBRES_DIA.slice(0, 1)).map((n) => (
                  <div key={n} className="bg-surface px-1 py-2 text-center text-[11px] font-semibold
                    text-muted-foreground uppercase">
                    {n}
                  </div>
                ))}
                {dias.map((dia) => (
                  (() =>
                  {
                    const clave = claveDeDiaCivil(dia);
                    const puntos = puntosDelDia(clave);
                    const esHoy = clave === claveHoy;
                    const esOtroMes = dia.mes !== base.mes;

                    return (
                      <button
                        key={clave}
                        type="button"
                        onClick={() =>
                        {
                          setBase(dia);
                          setVista("dia");
                          reflejarUrl("dia", dia);
                        }}
                        aria-label={`Ver ${etiquetaDiaCorta(dia).fecha}`}
                        className={`min-h-[96px] p-2 text-left align-top transition-colors
                          duration-200 lg:min-h-[112px]
                          ${esHoy ? "bg-info-soft ring-2 ring-primary ring-inset" : "bg-white hover:bg-surface"}
                          ${esOtroMes ? "opacity-45" : ""}`}
                      >
                        <span className={`text-[13px] font-semibold ${esHoy ? "text-primary" : "text-navy"}`}>
                          {dia.dia}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {puntos.slice(0, 4).map((p) => (
                            <span
                              key={p.key}
                              title={p.titulo}
                              className={`inline-block size-1.5 rounded-full border ${p.clase}`}
                            />
                          ))}
                          {puntos.length > 4 ? (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              +{puntos.length - 4}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })()
                ))}
              </div>
              {turnosFiltrados.length === 0 && props.externos.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Sin datos en este rango.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <AgendaCitasDia
        timeZone={props.timeZone}
        diaClave={diaSeleccionado}
        citas={citasFiltradas}
        onCambiarEstado={props.onCambiarEstado}
      />
    </div>
  );
}