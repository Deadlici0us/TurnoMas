"use client";

import type { DayKey, DayRange } from "@/lib/staff/schedule";
import { dayLabel } from "@/lib/staff/schedule";
import { errorDeFranjas, MAX_MINUTOS_DIA, PRESET_CORRIDO } from "@/lib/horarios/modelo-ui";
import DeslizadorRango from "./deslizador-rango";

interface FilaDiaHorarioProps
{
  readonly dia: DayKey;
  readonly franjas: readonly DayRange[];
  readonly onChange: (franjas: DayRange[]) => void;
}

/** Segunda franja sugerida al agregar descanso (15 a 20). */
const DESCANSO_SUGERIDO: DayRange = { openMinutes: 900, closeMinutes: 1200 };

/**
 * Fila de un día: switch Abierto/Cerrado + N franjas con slider + barra.
 *
 * Vacío = cerrado. El switch prendido sin franjas abre con jornada
 * corrida (9 a 19) para no dejar al barbero en un estado intermedio.
 *
 * @param dia Clave del día (`lun`...`dom`).
 * @param franjas Franjas actuales en minutos.
 * @param onChange Aviso de cambio con las franjas nuevas.
 */
export default function FilaDiaHorario({ dia, franjas, onChange }: FilaDiaHorarioProps)
{
  const abierto = franjas.length > 0;
  const error = errorDeFranjas(franjas);
  const nombre = dayLabel(dia);

  /** Prende/apaga el día completo. */
  function alternar(abrir: boolean): void
  {
    if (abrir)
    {
      onChange([...PRESET_CORRIDO]);
    }
    else
    {
      onChange([]);
    }
  }

  /** Agrega una franja de descanso sugerida. */
  function agregarFranja(): void
  {
    onChange([...franjas, { ...DESCANSO_SUGERIDO }]);
  }

  /** Actualiza la franja en la posición dada. */
  function actualizarFranja(indice: number, franja: DayRange): void
  {
    onChange(franjas.map((actual, i) => (i === indice ? franja : { ...actual })));
  }

  /** Quita la franja en la posición dada. */
  function quitarFranja(indice: number): void
  {
    onChange(franjas.filter((_, i) => i !== indice).map((franja) => ({ ...franja })));
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-sm font-medium text-slate-200">{nombre}</span>
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            role="switch"
            aria-label={`${nombre} abierto`}
            checked={abierto}
            onChange={(event) => alternar(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-white/15 transition-colors
              peer-checked:bg-amber-400 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500
              peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900
              after:absolute after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform
              peer-checked:after:translate-x-5"
          />
          <span className={`text-xs font-semibold ${abierto ? "text-amber-300" : "text-slate-500"}`}>
            {abierto ? "Abierto" : "Cerrado"}
          </span>
        </label>
        <div className="ml-auto hidden sm:block w-40" aria-hidden="true">
          <BarraDia franjas={franjas} />
        </div>
      </div>
      <div className="sm:hidden" aria-hidden="true">
        <BarraDia franjas={franjas} />
      </div>
      {abierto ? (
        <div className="space-y-3">
          {franjas.map((franja, indice) => (
            <div key={indice} className="flex gap-2 items-start">
              <div className="flex-1">
                <DeslizadorRango franja={franja} onChange={(nueva) => actualizarFranja(indice, nueva)} />
              </div>
              {franjas.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Quitar turno ${indice + 1} del ${nombre}`}
                  onClick={() => quitarFranja(indice)}
                  className="mt-1 shrink-0 min-w-[44px] min-h-[44px] px-2 rounded-lg border border-white/15
                    text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {error !== null ? (
            <p className="text-xs text-red-400" role="alert">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={agregarFranja}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors
              min-h-[44px] px-2 -ml-2 rounded-lg"
          >
            + Agregar turno (descanso en el medio)
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface BarraDiaProps
{
  readonly franjas: readonly DayRange[];
}

/**
 * Barra 0–24h que pinta las franjas ocupadas (solo lectura visual).
 *
 * @param franjas Franjas del día en minutos.
 */
function BarraDia({ franjas }: BarraDiaProps)
{
  return (
    <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
      {franjas.map((franja, indice) => (
        <div
          key={indice}
          className="absolute inset-y-0 rounded-full bg-amber-400/80"
          style={{
            left: `${(Math.max(0, franja.openMinutes) / MAX_MINUTOS_DIA) * 100}%`,
            width: `${(Math.max(0, franja.closeMinutes - franja.openMinutes) / MAX_MINUTOS_DIA) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
