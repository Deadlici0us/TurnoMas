"use client";

import type { DayRange } from "@/lib/staff/schedule";
import
{
  ajustarMinutos,
  formatearHoraCorta,
  horaAMinutos,
  MAX_MINUTOS_DIA,
  minutosAHora,
  PASO_STEPPER_MINUTOS,
} from "@/lib/horarios/modelo-ui";

interface ControlFranjaProps
{
  readonly franja: DayRange;
  readonly onChange: (franja: DayRange) => void;
}

/** Marca de la barra en horas (0, 6, 12, 18 y 24). */
const TICKS_BARRA = [0, 360, 720, 1080, 1440];

/**
 * Control de una franja con horas grandes y botones −/+.
 *
 * Cada extremo se ajusta de a 30 minutos con los steppers (frenan en los
 * bordes del día y antes de cruzarse) o con precisión total en el input
 * de hora. Debajo, una barra de lectura muestra el bloque ocupado.
 *
 * @param franja Franja actual en minutos.
 * @param onChange Aviso de cambio con la franja nueva.
 */
export default function ControlFranja({ franja, onChange }: ControlFranjaProps)
{
  const invalida = franja.closeMinutes <= franja.openMinutes;
  const izquierda = (Math.max(0, Math.min(franja.openMinutes, franja.closeMinutes)) / MAX_MINUTOS_DIA) * 100;
  const ancho = (Math.abs(franja.closeMinutes - franja.openMinutes) / MAX_MINUTOS_DIA) * 100;
  const duracion = invalida ? null : formatearDuracion(franja.closeMinutes - franja.openMinutes);

  /** Mueve la apertura sin salir del día ni alcanzar el cierre. */
  function moverApertura(delta: number): void
  {
    const tope = Math.max(0, franja.closeMinutes - PASO_STEPPER_MINUTOS);

    onChange({
      openMinutes: Math.min(ajustarMinutos(franja.openMinutes + delta), tope),
      closeMinutes: franja.closeMinutes,
    });
  }

  /** Mueve el cierre sin salir del día ni pisar la apertura. */
  function moverCierre(delta: number): void
  {
    const piso = Math.min(MAX_MINUTOS_DIA, franja.openMinutes + PASO_STEPPER_MINUTOS);

    onChange({
      openMinutes: franja.openMinutes,
      closeMinutes: Math.max(ajustarMinutos(franja.closeMinutes + delta), piso),
    });
  }

  /** Cambia un extremo desde el input de hora con precisión total. */
  function cambiarHora(esApertura: boolean, valor: string): void
  {
    try
    {
      const minutos = horaAMinutos(valor);

      if (esApertura)
      {
        onChange({ openMinutes: minutos, closeMinutes: franja.closeMinutes });
      }
      else
      {
        onChange({ openMinutes: franja.openMinutes, closeMinutes: minutos });
      }
    }
    catch
    {
      // Hora incompleta mientras se tipea: se ignora hasta que sea válida.
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <BotonPaso etiqueta="Atrasar apertura" simbolo="−" onClick={() => moverApertura(-PASO_STEPPER_MINUTOS)} />
          <input
            type="time"
            aria-label="Apertura"
            value={minutosAHora(franja.openMinutes)}
            onChange={(event) => cambiarHora(true, event.target.value)}
            className="w-24 px-1 py-1 text-2xl font-bold tabular-nums text-center bg-transparent text-slate-100
              rounded-lg outline-none [color-scheme:dark] focus:ring-2 focus:ring-amber-500"
          />
          <BotonPaso etiqueta="Adelantar apertura" simbolo="+" onClick={() => moverApertura(PASO_STEPPER_MINUTOS)} />
        </div>
        <span className="text-slate-500 font-bold" aria-hidden="true">—</span>
        <div className="flex items-center gap-1">
          <BotonPaso etiqueta="Atrasar cierre" simbolo="−" onClick={() => moverCierre(-PASO_STEPPER_MINUTOS)} />
          <input
            type="time"
            aria-label="Cierre"
            value={minutosAHora(franja.closeMinutes)}
            onChange={(event) => cambiarHora(false, event.target.value)}
            className="w-24 px-1 py-1 text-2xl font-bold tabular-nums text-center bg-transparent text-slate-100
              rounded-lg outline-none [color-scheme:dark] focus:ring-2 focus:ring-amber-500"
          />
          <BotonPaso etiqueta="Adelantar cierre" simbolo="+" onClick={() => moverCierre(PASO_STEPPER_MINUTOS)} />
        </div>
      </div>
      <div>
        <div className="relative h-2.5 rounded-full bg-white/10" aria-hidden="true">
          <div
            className="absolute inset-y-0 rounded-full bg-amber-400"
            style={{ left: `${izquierda}%`, width: `${ancho}%` }}
          />
        </div>
        <div className="relative h-4 text-[10px] tabular-nums text-slate-500" aria-hidden="true">
          {TICKS_BARRA.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2"
              style={{ left: `${(tick / MAX_MINUTOS_DIA) * 100}%` }}
            >
              {tick / 60}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center min-h-5" aria-live="polite">
        {duracion !== null ? (
          <span className="text-xs font-semibold text-amber-300">
            {formatearHoraCorta(franja.openMinutes)} a {formatearHoraCorta(franja.closeMinutes)} · {duracion}
          </span>
        ) : (
          <span className="text-xs text-red-400" role="alert">El cierre tiene que ser después de la apertura.</span>
        )}
      </div>
    </div>
  );
}

interface BotonPasoProps
{
  readonly etiqueta: string;
  readonly simbolo: string;
  readonly onClick: () => void;
}

/**
 * Botón −/+ para mover un extremo de a 30 minutos.
 *
 * @param etiqueta Nombre accesible del botón.
 * @param simbolo Símbolo visible (− o +).
 * @param onClick Acción al tocar.
 */
function BotonPaso({ etiqueta, simbolo, onClick }: BotonPasoProps)
{
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="shrink-0 size-11 rounded-full border border-white/15 text-lg font-bold leading-none text-slate-300
        hover:bg-white/10 hover:text-white active:bg-white/15 transition-colors"
    >
      {simbolo}
    </button>
  );
}

/**
 * Duración legible (`10 h`, `8:30 h`).
 *
 * @param minutos Duración en minutos.
 * @return Etiqueta de duración.
 */
function formatearDuracion(minutos: number): string
{
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (resto === 0)
  {
    return `${horas} h`;
  }

  return `${horas}:${String(resto).padStart(2, "0")} h`;
}
