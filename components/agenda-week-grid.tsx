"use client";

import { useMemo, useState } from "react";

import LeyendaEstados from "@/components/leyenda-estados";
import { claseGrillaPara, EXTERNO_LEYENDA } from "@/lib/dashboard/estados-colores";
import
{
  type DiaCivil,
  claveDeDiaCivil,
  claveDiaEnZona,
  inicioSemanaCivil,
  minutosEnZona,
  sumarDiasCiviles,
} from "@/lib/timezone/timezone";

export interface WeekGridTurno
{
  readonly id: string;
  readonly staffId: string;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: string;
  readonly titulo: string;
}

export interface WeekGridExterno
{
  readonly id: string;
  readonly titulo: string;
  readonly inicio: string;
  readonly fin: string;
}

interface AgendaWeekGridProps
{
  readonly base: string;
  readonly timeZone: string;
  readonly staff: ReadonlyArray<{ readonly id: string; readonly nombre: string }>;
  readonly turnos: readonly WeekGridTurno[];
  readonly externos: readonly WeekGridExterno[];
}

const HORA_DESDE_DEFECTO = 8;
const HORA_HASTA_DEFECTO = 20;
const PX_POR_HORA = 44;
const NOMBRES_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function etiquetaDia(dia: DiaCivil): { readonly semana: string; readonly fecha: string }
{
  const base = new Date(Date.UTC(dia.anio, dia.mes - 1, dia.dia));
  const weekday = base.getUTCDay();
  const dos = (n: number): string => String(n).padStart(2, "0");

  return { semana: NOMBRES_DIA[weekday] ?? "", fecha: `${dos(dia.dia)}/${dos(dia.mes)}` };
}

export default function AgendaWeekGrid({ base, timeZone, staff, turnos, externos }: AgendaWeekGridProps)
{
  const [staffId, setStaffId] = useState<string | null>(staff.length === 1 ? staff[0]?.id ?? null : null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const hoy = useMemo(() => new Date(base), [base]);
  const inicioSemana = useMemo(() =>
  {
    const referencia = Number.isNaN(hoy.getTime()) ? new Date() : hoy;
    const lunes = inicioSemanaCivil(referencia, timeZone);

    return sumarDiasCiviles(lunes, semanaOffset * 7);
  }, [hoy, semanaOffset, timeZone]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDiasCiviles(inicioSemana, i)), [inicioSemana]);

  const turnosFiltrados = staffId === null
    ? turnos
    : turnos.filter((t) => t.staffId === staffId);

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

      min = Math.min(min, minutosEnZona(inicio, timeZone));
      const mismoDia = claveDiaEnZona(inicio, timeZone) === claveDiaEnZona(fin, timeZone);

      max = Math.max(max, mismoDia ? minutosEnZona(fin, timeZone) : HORA_HASTA_DEFECTO * 60);
    };

    for (const t of turnosFiltrados)
    {
      considerar(t.inicio, t.fin);
    }

    for (const e of externos)
    {
      considerar(e.inicio, e.fin);
    }

    const horaDesde = Math.max(0, Math.min(HORA_DESDE_DEFECTO, Math.floor(min / 60)));
    const horaHasta = Math.min(24, Math.max(HORA_HASTA_DEFECTO, Math.ceil(max / 60)));

    return { horaDesde, horaHasta: Math.max(horaHasta, horaDesde + 4) };
  }, [turnosFiltrados, externos, timeZone]);

  const horas = useMemo(
    () => Array.from({ length: rango.horaHasta - rango.horaDesde }, (_, i) => rango.horaDesde + i),
    [rango],
  );
  const alto = (rango.horaHasta - rango.horaDesde) * PX_POR_HORA;
  const etiquetaRango = `${etiquetaDia(dias[0] as DiaCivil).fecha} – ` +
    `${etiquetaDia(dias[6] as DiaCivil).fecha}`;

  function bloquesDelDia(diaKey: string): Array<{ key: string; top: number; height: number; clase: string; titulo: string }>
  {
    const salida: Array<{ key: string; top: number; height: number; clase: string; titulo: string }> = [];

    const empujar = (key: string, inicioIso: string, finIso: string, clase: string, titulo: string): void =>
    {
      const inicio = new Date(inicioIso);
      const fin = new Date(finIso);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio)
      {
        return;
      }

      const claveInicio = claveDiaEnZona(inicio, timeZone);
      const claveFin = claveDiaEnZona(fin, timeZone);

      if (diaKey < claveInicio || diaKey > claveFin)
      {
        return;
      }

      const desdeCivil = diaKey === claveInicio ? minutosEnZona(inicio, timeZone) : 0;
      const hastaCivil = diaKey === claveFin ? minutosEnZona(fin, timeZone) : 24 * 60;
      const desde = Math.max(desdeCivil, rango.horaDesde * 60);
      const hasta = Math.min(hastaCivil === 0 && diaKey === claveFin ? 24 * 60 : hastaCivil, rango.horaHasta * 60);

      if (hasta <= desde)
      {
        return;
      }

      salida.push({
        key,
        top: ((desde - rango.horaDesde * 60) / 60) * PX_POR_HORA,
        height: Math.max(((hasta - desde) / 60) * PX_POR_HORA, 18),
        clase,
        titulo,
      });
    };

    for (const t of turnosFiltrados)
    {
      empujar(`t-${t.id}`, t.inicio, t.fin, claseGrillaPara(t.estado), `${t.titulo}`);
    }

    for (const e of externos)
    {
      empujar(`e-${e.id}`, e.inicio, e.fin, EXTERNO_LEYENDA.clase, `Google · ${e.titulo}`);
    }

    return salida;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Semana</h2>
          <p className="text-xs text-slate-500">
            {`Turnos y eventos de Google del negocio (${rango.horaDesde} a ${rango.horaHasta}h) · ` +
              `${etiquetaRango} · ${timeZone}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSemanaOffset((v) => v - 1)}
            aria-label="Semana anterior"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300
              text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => setSemanaOffset(0)}
            disabled={semanaOffset === 0}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              semanaOffset === 0
                ? "border-slate-200 text-slate-400 cursor-default"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSemanaOffset((v) => v + 1)}
            aria-label="Semana siguiente"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300
              text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <LeyendaEstados incluirExterno />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStaffId(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              staffId === null
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todos
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => setStaffId(s.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
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
      <div className="overflow-auto max-h-[70vh]">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50" />
            {dias.map((dia) => (
              <div key={claveDeDiaCivil(dia)} className="bg-slate-50 px-2 py-1.5 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">
                  {etiquetaDia(dia).semana}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {etiquetaDia(dia).fecha}
                </div>
              </div>
            ))}
            <div className="bg-white relative" style={{ height: alto }}>
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-slate-100 text-[10px] text-slate-400 pl-1"
                  style={{ top: (h - rango.horaDesde) * PX_POR_HORA }}
                >
                  {`${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>
            {dias.map((dia) => (
              <div key={claveDeDiaCivil(dia)} className="bg-white relative" style={{ height: alto }}>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: (h - rango.horaDesde) * PX_POR_HORA }}
                  />
                ))}
                {bloquesDelDia(claveDeDiaCivil(dia)).map((b) => (
                  <div
                    key={b.key}
                    title={b.titulo}
                    className={`absolute inset-x-1 rounded-md border px-1 py-0.5 text-[10px] leading-tight font-semibold overflow-hidden ${b.clase}`}
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
    </div>
  );
}
