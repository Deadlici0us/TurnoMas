"use client";

import { useMemo, useState } from "react";

import LeyendaEstados from "@/components/leyenda-estados";
import { claseGrillaPara, EXTERNO_LEYENDA } from "@/lib/dashboard/estados-colores";

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
  readonly staff: ReadonlyArray<{ readonly id: string; readonly nombre: string }>;
  readonly turnos: readonly WeekGridTurno[];
  readonly externos: readonly WeekGridExterno[];
}

const HORA_DESDE_DEFECTO = 8;
const HORA_HASTA_DEFECTO = 20;
const PX_POR_HORA = 44;

function inicioDelDia(base: Date, offset: number): Date
{
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 0, 0, 0, 0);
}

function inicioDeSemana(fecha: Date): Date
{
  const lunes = inicioDelDia(fecha, 0);
  const desfase = (lunes.getDay() + 6) % 7;

  return inicioDelDia(lunes, -desfase);
}

function minutosDesdeHora(date: Date): number
{
  return date.getHours() * 60 + date.getMinutes();
}

export default function AgendaWeekGrid({ base, staff, turnos, externos }: AgendaWeekGridProps)
{
  const [staffId, setStaffId] = useState<string | null>(staff.length === 1 ? staff[0]?.id ?? null : null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const hoy = useMemo(() => new Date(base), [base]);
  const inicioSemana = useMemo(() =>
  {
    const referencia = new Date(hoy.getTime() + semanaOffset * 7 * 86_400_000);

    return inicioDeSemana(referencia);
  }, [hoy, semanaOffset]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => inicioDelDia(inicioSemana, i)), [inicioSemana]);

  const turnosFiltrados = staffId === null
    ? turnos
    : turnos.filter((t) => t.staffId === staffId);

  const rango = useMemo(() =>
  {
    const finSemana = new Date(inicioSemana.getTime() + 7 * 86_400_000);
    let min = HORA_DESDE_DEFECTO * 60;
    let max = HORA_HASTA_DEFECTO * 60;

    const considerar = (inicioIso: string, finIso: string): void =>
    {
      const inicio = new Date(inicioIso);
      const fin = new Date(finIso);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicioSemana || inicio >= finSemana)
      {
        return;
      }

      min = Math.min(min, minutosDesdeHora(inicio));
      max = Math.max(max, minutosDesdeHora(fin) <= minutosDesdeHora(inicio)
        ? HORA_HASTA_DEFECTO * 60
        : minutosDesdeHora(fin));
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
  }, [turnosFiltrados, externos, inicioSemana]);

  const horas = useMemo(
    () => Array.from({ length: rango.horaHasta - rango.horaDesde }, (_, i) => rango.horaDesde + i),
    [rango],
  );
  const alto = (rango.horaHasta - rango.horaDesde) * PX_POR_HORA;
  const finSemanaVisible = new Date(inicioSemana.getTime() + 6 * 86_400_000);
  const etiquetaRango = `${inicioSemana.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} – ` +
    `${finSemanaVisible.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  function bloquesDelDia(dia: Date): Array<{ key: string; top: number; height: number; clase: string; titulo: string }>
  {
    const finDia = new Date(dia.getTime() + 86_400_000);
    const salida: Array<{ key: string; top: number; height: number; clase: string; titulo: string }> = [];

    for (const t of turnosFiltrados)
    {
      const inicio = new Date(t.inicio);
      const fin = new Date(t.fin);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= dia || inicio >= finDia)
      {
        continue;
      }

      const desde = Math.max(minutosDesdeHora(inicio), rango.horaDesde * 60);
      const hasta = Math.min(minutosDesdeHora(fin), rango.horaHasta * 60);

      if (hasta <= desde)
      {
        continue;
      }

      salida.push({
        key: `t-${t.id}`,
        top: ((desde - rango.horaDesde * 60) / 60) * PX_POR_HORA,
        height: Math.max(((hasta - desde) / 60) * PX_POR_HORA, 18),
        clase: claseGrillaPara(t.estado),
        titulo: t.titulo,
      });
    }

    for (const e of externos)
    {
      const inicio = new Date(e.inicio);
      const fin = new Date(e.fin);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= dia || inicio >= finDia)
      {
        continue;
      }

      const desde = Math.max(minutosDesdeHora(inicio), rango.horaDesde * 60);
      const hasta = Math.min(minutosDesdeHora(fin), rango.horaHasta * 60);

      if (hasta <= desde)
      {
        continue;
      }

      salida.push({
        key: `e-${e.id}`,
        top: ((desde - rango.horaDesde * 60) / 60) * PX_POR_HORA,
        height: Math.max(((hasta - desde) / 60) * PX_POR_HORA, 18),
        clase: EXTERNO_LEYENDA.clase,
        titulo: `Google · ${e.titulo}`,
      });
    }

    return salida;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Semana</h2>
          <p className="text-xs text-slate-500">
            {`Turnos y eventos de Google del negocio (${rango.horaDesde} a ${rango.horaHasta}h) · ${etiquetaRango}`}
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
              <div key={dia.toISOString()} className="bg-slate-50 px-2 py-1.5 text-center">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">
                  {dia.toLocaleDateString("es-AR", { weekday: "short" })}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {dia.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
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
              <div key={dia.toISOString()} className="bg-white relative" style={{ height: alto }}>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: (h - rango.horaDesde) * PX_POR_HORA }}
                  />
                ))}
                {bloquesDelDia(dia).map((b) => (
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
