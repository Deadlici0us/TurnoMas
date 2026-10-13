"use client";

import type { DayRange } from "@/lib/staff/schedule";
import { MAX_MINUTOS_DIA, minutosAHora, horaAMinutos, PASO_SLIDER_MINUTOS } from "@/lib/horarios/modelo-ui";

interface DeslizadorRangoProps
{
  readonly franja: DayRange;
  readonly onChange: (franja: DayRange) => void;
}

/**
 * Deslizador dual para una franja (apertura/cierre).
 *
 * Combina dos `range` táctiles con dos `time` nativos sincronizados:
 * el slider es lo visual para barberos, el input de hora es el respaldo
 * accesible y preciso.
 *
 * @param franja Franja actual en minutos.
 * @param onChange Aviso de cambio con la franja nueva.
 */
export default function DeslizadorRango({ franja, onChange }: DeslizadorRangoProps)
{
  const invalida = franja.closeMinutes <= franja.openMinutes;
  const izquierda = Math.max(0, (Math.min(franja.openMinutes, franja.closeMinutes) / MAX_MINUTOS_DIA) * 100);
  const ancho = Math.max(0, (Math.abs(franja.closeMinutes - franja.openMinutes) / MAX_MINUTOS_DIA) * 100);

  /** Cambia la apertura desde el slider o el input de hora. */
  function cambiarApertura(valor: number): void
  {
    onChange({ openMinutes: valor, closeMinutes: franja.closeMinutes });
  }

  /** Cambia el cierre desde el slider o el input de hora. */
  function cambiarCierre(valor: number): void
  {
    onChange({ openMinutes: franja.openMinutes, closeMinutes: valor });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="time"
          aria-label="Apertura"
          value={minutosAHora(franja.openMinutes)}
          onChange={(event) =>
          {
            try
            {
              cambiarApertura(horaAMinutos(event.target.value));
            }
            catch
            {
              // Hora incompleta mientras se tipea: se ignora hasta que sea válida.
            }
          }}
          className="w-24 px-2 py-1.5 text-sm bg-white/5 border border-white/15 text-slate-100 rounded-lg
            outline-none [color-scheme:dark] focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <span className="text-slate-500 text-sm" aria-hidden="true">—</span>
        <input
          type="time"
          aria-label="Cierre"
          value={minutosAHora(franja.closeMinutes)}
          onChange={(event) =>
          {
            try
            {
              cambiarCierre(horaAMinutos(event.target.value));
            }
            catch
            {
              // Hora incompleta mientras se tipea: se ignora hasta que sea válida.
            }
          }}
          className="w-24 px-2 py-1.5 text-sm bg-white/5 border border-white/15 text-slate-100 rounded-lg
            outline-none [color-scheme:dark] focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <span className="ml-auto text-xs font-semibold text-amber-300" aria-live="polite">
          {etiquetaFranja(franja)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-white/10" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-amber-400/80"
          style={{ left: `${izquierda}%`, width: `${ancho}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="range"
          aria-label="Apertura deslizable"
          min={0}
          max={MAX_MINUTOS_DIA}
          step={PASO_SLIDER_MINUTOS}
          value={franja.openMinutes}
          onChange={(event) => cambiarApertura(Number(event.target.value))}
          className="w-full accent-amber-400 min-h-[44px]"
        />
        <input
          type="range"
          aria-label="Cierre deslizable"
          min={0}
          max={MAX_MINUTOS_DIA}
          step={PASO_SLIDER_MINUTOS}
          value={franja.closeMinutes}
          onChange={(event) => cambiarCierre(Number(event.target.value))}
          className="w-full accent-amber-400 min-h-[44px]"
        />
      </div>
      {invalida ? (
        <p className="text-xs text-red-400" role="alert">El cierre tiene que ser después de la apertura.</p>
      ) : null}
    </div>
  );
}

/**
 * Etiqueta legible de la franja (`9 a 19`, `9:30 a 13`).
 *
 * @param franja Franja en minutos.
 * @return Etiqueta corta.
 */
function etiquetaFranja(franja: DayRange): string
{
  return `${corta(franja.openMinutes)} a ${corta(franja.closeMinutes)}`;
}

/**
 * Hora corta sin minutos en punto (`9`, `9:30`).
 *
 * @param minutes Minutos desde medianoche.
 * @return Etiqueta corta.
 */
function corta(minutes: number): string
{
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0)
  {
    return String(hours);
  }

  return `${String(hours)}:${String(rest).padStart(2, "0")}`;
}
