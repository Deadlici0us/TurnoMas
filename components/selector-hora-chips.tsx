"use client";

import { minutosAHora, OPCIONES_HORAS_30 } from "@/lib/horarios/modelo-ui";

interface SelectorHoraChipsProps
{
  /** Título del grupo (ej. `Abrís`, `Cerrás`). */
  readonly etiqueta: string;
  /** Valor actual en minutos. */
  readonly valor: number;
  /** Aviso de cambio con los minutos elegidos. */
  readonly onChange: (minutos: number) => void;
  /** Mínimo elegible en minutos (inclusive). Las menores quedan deshabilitadas. */
  readonly min?: number;
  /** Máximo elegible en minutos (inclusive). Las mayores quedan deshabilitadas. */
  readonly max?: number;
  /** ID base para asociar el grupo con su título. */
  readonly id?: string;
}

/**
 * Grilla de chips de hora cada 30 minutos para elegir un extremo.
 *
 * Las opciones fuera de `min`/`max` se deshabilitan (ej. el cierre no
 * puede ser anterior a la apertura). Si el valor actual no está en la
 * grilla (ej. legacy `09:15`), se conserva y se avisa como personalizado
 * hasta que se elige un chip.
 *
 * @param etiqueta Título del grupo.
 * @param valor Valor actual en minutos.
 * @param onChange Aviso de cambio.
 * @param min Mínimo elegible.
 * @param max Máximo elegible.
 * @param id ID base del grupo.
 */
export default function SelectorHoraChips({ etiqueta, valor, onChange, min, max, id }: SelectorHoraChipsProps)
{
  const tituloId = `${id ?? etiqueta}-titulo`;
  const personalizado = !OPCIONES_HORAS_30.includes(valor);

  return (
    <fieldset className="space-y-2" aria-labelledby={tituloId}>
      <legend id={tituloId} className="text-xs font-semibold text-slate-300">
        {etiqueta}
        {personalizado ? (
          <span className="ml-2 font-normal text-slate-500">
            Horario personalizado ({minutosAHora(valor)}) — elegí un horario para ajustarlo
          </span>
        ) : null}
      </legend>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5" role="group" aria-label={`Opciones de ${etiqueta}`}>
        {OPCIONES_HORAS_30.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={opcion === valor}
            disabled={(min !== undefined && opcion < min) || (max !== undefined && opcion > max)}
            onClick={() => onChange(opcion)}
            className={`min-h-[44px] px-1 rounded-lg text-sm font-semibold tabular-nums transition-colors
              disabled:opacity-25 disabled:pointer-events-none
              ${opcion === valor
                ? "bg-amber-400 text-slate-900 shadow"
                : "border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white"}`}
          >
            {minutosAHora(opcion)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
