"use client";

import { useMemo, useState } from "react";

import LeyendaEstados from "@/components/leyenda-estados";
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
import
{
  type DiaCivil,
  claveDeDiaCivil,
  claveDiaEnZona,
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
}

export interface CalendarExterno
{
  readonly id: string;
  readonly titulo: string;
  readonly inicio: string;
  readonly fin: string;
}

interface AgendaCalendarProps
{
  readonly base: string;
  readonly timeZone: string;
  readonly staff: ReadonlyArray<{ readonly id: string; readonly nombre: string }>;
  readonly turnos: readonly CalendarTurno[];
  readonly externos: readonly CalendarExterno[];
  readonly vistaInicial?: unknown;
  readonly fechaInicial?: unknown;
}

const HORA_DESDE_DEFECTO = 8;
const HORA_HASTA_DEFECTO = 20;
const PX_POR_HORA_DIA = 60;
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

function etiquetaRango(vista: VistaAgenda, dias: readonly DiaCivil[], base: DiaCivil): string
{
  if (dias.length === 0)
  {
    return "";
  }

  const primero = dias[0] as DiaCivil;
  const ultimo = dias[dias.length - 1] as DiaCivil;

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
 * Calendario visual de la agenda con vistas día, semana y mes.
 *
 * Día en curso por defecto; navegación por día/semana/mes, selector
 * de fecha y filtro por profesional. Solo visual: las acciones
 * (cambiar estado, WhatsApp) siguen en la lista inferior de la página.
 *
 * @return Calendario con toolbar, vistas y leyenda de estados.
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

  const turnosFiltrados = staffId === null
    ? props.turnos
    : props.turnos.filter((t) => t.staffId === staffId);

  const rango = useMemo(() =>
  {
    let min = HORA_DESDE_DEFECTO * 60;
    let max = HORA_HASTA_DEFECTO * 60;

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

      max = Math.max(max, mismoDia ? minutosEnZona(fin, props.timeZone) : HORA_HASTA_DEFECTO * 60);
    };

    for (const t of turnosFiltrados)
    {
      considerar(t.inicio, t.fin);
    }

    for (const e of props.externos)
    {
      considerar(e.inicio, e.fin);
    }

    const horaDesde = Math.max(0, Math.min(HORA_DESDE_DEFECTO, Math.floor(min / 60)));
    const horaHasta = Math.min(24, Math.max(HORA_HASTA_DEFECTO, Math.ceil(max / 60)));

    return { horaDesde, horaHasta: Math.max(horaHasta, horaDesde + 4) };
  }, [turnosFiltrados, props.externos, props.timeZone]);

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

  function bloquesDelDia(diaKey: string): Array<{ key: string; top: number; height: number; clase: string; titulo: string }>
  {
    const salida: Array<{ key: string; top: number; height: number; clase: string; titulo: string }> = [];
    const pxPorHora = vista === "dia" ? PX_POR_HORA_DIA : 44;

    const empujar = (key: string, inicioIso: string, finIso: string, clase: string, titulo: string): void =>
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
      });
    };

    for (const t of turnosFiltrados)
    {
      empujar(`t-${t.id}`, t.inicio, t.fin, claseGrillaPara(t.estado), `${t.titulo}`);
    }

    for (const e of props.externos)
    {
      empujar(`e-${e.id}`, e.inicio, e.fin, EXTERNO_LEYENDA.clase, `Google · ${e.titulo}`);
    }

    return salida;
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

  const etiquetaMovimiento = vista === "dia" ? "Día" : vista === "semana" ? "Semana" : "Mes";
  const altoDia = (rango.horaHasta - rango.horaDesde) * PX_POR_HORA_DIA;
  const altoSemana = (rango.horaHasta - rango.horaDesde) * 44;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-base font-semibold text-slate-900">Calendario</p>
          <p className="text-xs text-slate-500">
            {`${etiquetaRango(vista, dias, base)} · ${props.timeZone}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Vista de agenda">
          {VISTAS_AGENDA.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => cambiarVista(v)}
              aria-pressed={vista === v}
              className={`h-8 px-3 rounded-xl text-[13px] font-semibold border transition-colors ${
                vista === v
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {ETIQUETA_VISTA[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label={`${etiquetaMovimiento} anterior`}
          className="h-9 min-w-9 px-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
        >
          ←
        </button>
        <button
          type="button"
          onClick={irHoy}
          className="h-9 px-4 rounded-xl border border-slate-300 text-slate-600 text-[13px] font-semibold hover:bg-slate-50"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label={`${etiquetaMovimiento} siguiente`}
          className="h-9 min-w-9 px-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
        >
          →
        </button>
        <input
          type="date"
          defaultValue={claveDeBase(base)}
          key={claveDeBase(base)}
          onChange={(e) => elegirFecha(e.target.value)}
          aria-label="Ir a fecha"
          className="h-9 px-3 rounded-xl border border-slate-300 text-[13px] text-slate-600 outline-none
            focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <LeyendaEstados incluirExterno />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStaffId(null)}
            className={`h-8 px-3 rounded-xl border text-[13px] font-semibold transition-colors ${
              staffId === null
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todos
          </button>
          {props.staff.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStaffId(s.id)}
              className={`h-8 px-3 rounded-xl border text-[13px] font-semibold transition-colors ${
                staffId === s.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      </div>
      {vista === "dia" ? (
        <div className="grid grid-cols-[56px_1fr] gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-2 py-2 text-center">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">
              {etiquetaDiaCorta(base).semana}
            </div>
            <div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
              ${claveDeBase(base) === claveHoy ? "bg-violet-600 text-white" : "text-slate-900"}`}>
              {etiquetaDiaCorta(base).numero}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              {claveDeBase(base) === claveHoy ? "Hoy" : etiquetaDiaCorta(base).fecha}
            </div>
          </div>
          <div className="bg-white relative" style={{ height: altoDia }}>
            {horas.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-slate-100"
                style={{ top: (h - rango.horaDesde) * PX_POR_HORA_DIA }}
              >
                <span className="absolute left-1 -top-2 bg-white px-1 font-mono text-[11px] text-slate-400 tabular-nums">
                  {`${String(h).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
            {bloquesDelDia(claveDeBase(base)).map((b) => (
              <div
                key={b.key}
                title={b.titulo}
                className={`absolute inset-x-1 rounded-[10px] border p-2 text-xs leading-[18px] font-semibold overflow-hidden ${b.clase}`}
                style={{ top: b.top, height: b.height }}
              >
                {b.titulo}
              </div>
            ))}
            {bloquesDelDia(claveDeBase(base)).length === 0 ? (
              <p className="absolute inset-x-0 top-1/2 text-center text-sm text-slate-400">
                Sin turnos este día.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {vista === "semana" ? (
        <div className="overflow-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50" />
              {dias.map((dia) => (
                <div
                  key={claveDeDiaCivil(dia)}
                  className={`px-2 py-1.5 text-center ${claveDeDiaCivil(dia) === claveHoy ? "bg-violet-100/50 ring-2 ring-inset ring-violet-500" : "bg-slate-50"}`}
                >
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">
                    {etiquetaDiaCorta(dia).semana}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {etiquetaDiaCorta(dia).fecha}
                  </div>
                </div>
              ))}
              <div className="bg-white relative" style={{ height: altoSemana }}>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-slate-100 text-[11px] font-mono text-slate-400 pl-1 tabular-nums"
                    style={{ top: (h - rango.horaDesde) * 44 }}
                  >
                    {`${String(h).padStart(2, "0")}:00`}
                  </div>
                ))}
              </div>
              {dias.map((dia) => (
                <div
                  key={claveDeDiaCivil(dia)}
                  className={`relative ${claveDeDiaCivil(dia) === claveHoy ? "bg-violet-50/60" : "bg-white"}`}
                  style={{ height: altoSemana }}
                >
                  {horas.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-slate-100"
                      style={{ top: (h - rango.horaDesde) * 44 }}
                    />
                  ))}
                  {bloquesDelDia(claveDeDiaCivil(dia)).map((b) => (
                    <div
                      key={b.key}
                      title={b.titulo}
                      className={`absolute inset-x-1 rounded-md border px-1 py-0.5 text-[11px] leading-tight font-semibold overflow-hidden ${b.clase}`}
                      style={{ top: b.top, height: b.height }}
                    >
                      {b.titulo}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {vista === "mes" ? (
        <div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {NOMBRES_DIA.slice(1).concat(NOMBRES_DIA.slice(0, 1)).map((n) => (
              <div key={n} className="bg-slate-50 px-1 py-1.5 text-center text-[11px] font-semibold text-slate-500 uppercase">
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
                    className={`min-h-[96px] lg:min-h-[112px] p-2 text-left align-top transition-colors
                      ${esHoy ? "bg-white ring-2 ring-inset ring-violet-500" : "bg-white hover:bg-slate-50"}
                      ${esOtroMes ? "opacity-50" : ""}`}
                  >
                    <span className={`text-[13px] font-semibold ${esHoy ? "text-violet-700" : "text-slate-900"}`}>
                      {dia.dia}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {puntos.slice(0, 4).map((p) => (
                        <span
                          key={p.key}
                          title={p.titulo}
                          className={`inline-block h-1.5 w-1.5 rounded-full border ${p.clase}`}
                        />
                      ))}
                      {puntos.length > 4 ? (
                        <span className="text-[10px] font-semibold text-slate-500">+{puntos.length - 4}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })()
            ))}
          </div>
          {turnosFiltrados.length === 0 && props.externos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Sin datos en este rango.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
