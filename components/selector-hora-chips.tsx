"use client";

import { horaAMinutos, minutosAHora } from "@/lib/horarios/modelo-ui";

interface SelectorHoraChipsProps
{
  /** Título del campo (ej. `Abrís`, `Cerrás`). */
  readonly etiqueta: string;
  /** Valor actual en minutos. */
  readonly valor: number;
  /** Aviso de cambio con los minutos elegidos. */
  readonly onChange: (minutos: number) => void;
  /** ID base para asociar el campo con su etiqueta. */
  readonly id?: string;
}

/**
 * Selector de hora simple con el reloj nativo del sistema.
 *
 * Un solo control grande (`<input type="time">`) en vez de 48 chips.
 * Usa el picker familiar del celu/navegador. No limita con `min`/`max`
 * nativos para no bloquear el envío con burbujas en inglés: la
 * validación amable en español (`errorDeFranjas`) avisa si el cierre
 * queda antes de la apertura o si los turnos se superponen. Valores
 * legacy fuera de 30 min (ej. `09:15`) se muestran igual y se conservan
 * hasta que se elige otra hora. Texto vacío o inválido se ignora.
 *
 * @param etiqueta Título visible del campo.
 * @param valor Valor actual en minutos.
 * @param onChange Aviso de cambio.
 * @param id ID base del campo.
 * @return Campo de hora nativo.
 */
export default function SelectorHoraChips({ etiqueta, valor, onChange, id }: SelectorHoraChipsProps)
{
  const inputId: string = `${id ?? etiqueta}-hora`;
  const valorTexto: string = minutosAHora(Math.min(Math.max(0, valor), 1439));

  /**
   * Convierte el texto del reloj a minutos y avisa.
   *
   * @param crudo Texto `HH:MM` del input nativo.
   */
  function manejarCambio(crudo: string): void
  {
    if (crudo.length === 0)
    {
      return;
    }

    try
    {
      onChange(horaAMinutos(crudo));
    }
    catch
    {
      return;
    }
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-slate-300"
      >
        {etiqueta}
      </label>
      <input
        id={inputId}
        type="time"
        step={1800}
        value={valorTexto}
        onChange={(event) => manejarCambio(event.target.value)}
        aria-label={etiqueta}
        className="w-full min-h-[48px] px-4 rounded-xl border border-white/15 bg-white/5 text-slate-100 text-base
          font-semibold tabular-nums outline-none [color-scheme:dark]
          focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
      />
      <p className="text-[11px] text-slate-500">Tocá la hora y elegí con el reloj de tu celu.</p>
    </div>
  );
}
