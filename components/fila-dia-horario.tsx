"use client";

import { Switch } from "@base-ui/react/switch";

import type { DayKey, DayRange } from "@/lib/staff/schedule";
import { dayLabel } from "@/lib/staff/schedule";
import { errorDeFranjas, formatearHoraCorta, PRESET_CORRIDO } from "@/lib/horarios/modelo-ui";
import ControlFranja from "./control-franja";

interface FilaDiaHorarioProps
{
  readonly dia: DayKey;
  readonly franjas: readonly DayRange[];
  readonly onChange: (franjas: DayRange[]) => void;
}

/** Segunda franja sugerida al agregar descanso (15 a 20). */
const DESCANSO_SUGERIDO: DayRange = { openMinutes: 900, closeMinutes: 1200 };

/**
 * Fila de un día: nombre + resumen + switch, y debajo los turnos.
 *
 * Vacío = cerrado. Al prender el switch sin franjas abre con jornada
 * corrida (9 a 19) para no dejar un estado intermedio.
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
    <div className={`rounded-2xl border p-4 space-y-3 transition-colors ${abierto
      ? "border-amber-400/30 bg-amber-400/5"
      : "border-white/10 bg-white/5"}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{nombre}</p>
          <p className={`text-xs tabular-nums truncate ${abierto ? "text-amber-200/90" : "text-slate-500"}`}>
            {abierto ? resumirFranjas(franjas) : "Cerrado"}
          </p>
        </div>
        <Switch.Root
          checked={abierto}
          onCheckedChange={(checked) => alternar(checked)}
          aria-label={`${nombre} abierto`}
          className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-white/15 transition-colors
            data-checked:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-500
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 outline-none"
        >
          <Switch.Thumb
            className={`block size-6 rounded-full bg-white shadow transition-transform
              ${abierto ? "translate-x-7" : "translate-x-1"}`}
          />
        </Switch.Root>
      </div>
      {abierto ? (
        <div className="space-y-4 pt-1">
          {franjas.map((franja, indice) => (
            <div key={indice} className="flex gap-1 items-start">
              <span className="pt-4 text-[10px] font-bold text-slate-500 w-4 shrink-0" aria-hidden="true">
                {franjas.length > 1 ? indice + 1 : ""}
              </span>
              <div className="flex-1 min-w-0">
                <ControlFranja franja={franja} onChange={(nueva) => actualizarFranja(indice, nueva)} />
              </div>
              {franjas.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Quitar turno ${indice + 1} del ${nombre}`}
                  onClick={() => quitarFranja(indice)}
                  className="mt-2 shrink-0 size-11 rounded-full border border-white/15 text-xl leading-none
                    text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {error !== null ? (
            <p className="text-xs text-red-400 font-medium" role="alert">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={agregarFranja}
            className="w-full text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-400/10
              transition-colors min-h-[44px] px-3 rounded-xl border border-dashed border-amber-400/30"
          >
            + Agregar segundo turno
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Resume las franjas del día (`9 a 19`, `9 a 13 y 15 a 20`).
 *
 * @param franjas Franjas del día en minutos.
 * @return Resumen legible.
 */
function resumirFranjas(franjas: readonly DayRange[]): string
{
  return franjas
    .map((franja) => `${formatearHoraCorta(franja.openMinutes)} a ${formatearHoraCorta(franja.closeMinutes)}`)
    .join(" y ");
}
