"use client";

import { useMemo, useState } from "react";

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

const HORA_DESDE = 8;
const HORA_HASTA = 20;
const PX_POR_HORA = 44;

const ESTADO_FONDO: Record<string, string> = {
  pendiente: "bg-amber-200 border-amber-400 text-amber-900",
  confirmado: "bg-blue-200 border-blue-400 text-blue-900",
  pagado: "bg-green-200 border-green-400 text-green-900",
  completado: "bg-slate-200 border-slate-300 text-slate-600",
  ausente: "bg-red-200 border-red-400 text-red-900",
  cancelado: "bg-slate-100 border-slate-200 text-slate-400 line-through",
};

function inicioDelDia(base: Date, offset: number): Date
{
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 0, 0, 0, 0);
}

function minutosDesdeHora(date: Date): number
{
  return date.getHours() * 60 + date.getMinutes();
}

export default function AgendaWeekGrid({ base, staff, turnos, externos }: AgendaWeekGridProps)
{
  const [staffId, setStaffId] = useState<string | null>(staff.length === 1 ? staff[0]?.id ?? null : null);
  const hoy = useMemo(() => new Date(base), [base]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => inicioDelDia(hoy, i)), [hoy]);
  const horas = useMemo(
    () => Array.from({ length: HORA_HASTA - HORA_DESDE }, (_, i) => HORA_DESDE + i),
    [],
  );

  const turnosFiltrados = staffId === null
    ? turnos
    : turnos.filter((t) => t.staffId === staffId);

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

      const desde = Math.max(minutosDesdeHora(inicio), HORA_DESDE * 60);
      const hasta = Math.min(minutosDesdeHora(fin), HORA_HASTA * 60);

      if (hasta <= desde)
      {
        continue;
      }

      salida.push({
        key: `t-${t.id}`,
        top: ((desde - HORA_DESDE * 60) / 60) * PX_POR_HORA,
        height: Math.max(((hasta - desde) / 60) * PX_POR_HORA, 18),
        clase: ESTADO_FONDO[t.estado] ?? ESTADO_FONDO.cancelado,
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

      const desde = Math.max(minutosDesdeHora(inicio), HORA_DESDE * 60);
      const hasta = Math.min(minutosDesdeHora(fin), HORA_HASTA * 60);

      if (hasta <= desde)
      {
        continue;
      }

      salida.push({
        key: `e-${e.id}`,
        top: ((desde - HORA_DESDE * 60) / 60) * PX_POR_HORA,
        height: Math.max(((hasta - desde) / 60) * PX_POR_HORA, 18),
        clase: "bg-slate-300/70 border-slate-400 text-slate-700",
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
          <p className="text-xs text-slate-500">Turnos y eventos de Google del negocio (8 a 20h)</p>
        </div>
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
      <div className="overflow-x-auto">
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
            <div className="bg-white relative" style={{ height: (HORA_HASTA - HORA_DESDE) * PX_POR_HORA }}>
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-slate-100 text-[10px] text-slate-400 pl-1"
                  style={{ top: (h - HORA_DESDE) * PX_POR_HORA }}
                >
                  {`${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>
            {dias.map((dia) => (
              <div key={dia.toISOString()} className="bg-white relative" style={{ height: (HORA_HASTA - HORA_DESDE) * PX_POR_HORA }}>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: (h - HORA_DESDE) * PX_POR_HORA }}
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
