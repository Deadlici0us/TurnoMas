"use client";

import { useState } from "react";

import { Switch } from "@base-ui/react/switch";

import type { DayKey, DayRange } from "@/lib/staff/schedule";
import { dayLabel } from "@/lib/staff/schedule";
import
{
  errorDeFranjas,
  formatearHoraCorta,
  modoDeFranjas,
  normalizarDiaAMaxDos,
  PRESET_CORRIDO,
} from "@/lib/horarios/modelo-ui";
import SelectorHoraChips from "./selector-hora-chips";

interface FilaDiaHorarioProps
{
  readonly dia: DayKey;
  readonly franjas: readonly DayRange[];
  readonly onChange: (franjas: DayRange[]) => void;
}

/** Segunda franja sugerida al pasar a cortado (15 a 20). */
const DESCANSO_SUGERIDO: DayRange = { openMinutes: 900, closeMinutes: 1200 };

/**
 * Asistente de un día: switch, modo corrido/cortado y reloj nativo.
 *
 * Vacío = cerrado. El switch prendido abre con jornada corrida (9 a 19).
 * El modo cortado agrega la 2ª franja (tope: 2 por día, sin botón
 * de agregar). Cada extremo se elige con el reloj del sistema
 * (1 control grande por hora, familiar para no tecnológicos).
 *
 * @param dia Clave del día (`lun`...`dom`).
 * @param franjas Franjas actuales en minutos (máx 2).
 * @param onChange Aviso de cambio con las franjas nuevas.
 */
export default function FilaDiaHorario({ dia, franjas, onChange }: FilaDiaHorarioProps)
{
  const diaNormalizado = normalizarDiaAMaxDos(franjas);
  const abierto = diaNormalizado.length > 0;
  const modo = modoDeFranjas(diaNormalizado);
  const error = errorDeFranjas(diaNormalizado);
  const nombre = dayLabel(dia);
  const [expandido, setExpandido] = useState(false);
  const primera = diaNormalizado[0];
  const segunda = diaNormalizado[1];

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

  /** Cambia entre corrido (1 turno) y cortado (2 turnos). */
  function cambiarModo(cortado: boolean): void
  {
    if (cortado)
    {
      onChange([
        primera === undefined ? { ...PRESET_CORRIDO[0] } : { ...primera },
        { ...DESCANSO_SUGERIDO },
      ]);
    }
    else if (primera !== undefined)
    {
      onChange([{ ...primera }]);
    }
  }

  /** Cambia un extremo de la franja indicada. */
  function cambiarExtremo(indice: number, campo: "openMinutes" | "closeMinutes", minutos: number): void
  {
    onChange(diaNormalizado.map((franja, i) => (i === indice ? { ...franja, [campo]: minutos } : { ...franja })));
  }

  return (
    <div className={`rounded-2xl border transition-colors ${abierto
      ? "border-amber-400/30 bg-amber-400/5"
      : "border-white/10 bg-white/5"}`}>
      <button
        type="button"
        onClick={() => setExpandido((previo) => !previo)}
        aria-expanded={expandido || !abierto ? true : expandido}
        aria-label={`${nombre}: ${abierto ? resumirFranjas(diaNormalizado) : "Cerrado"}. Tocar para ${expandido ? "colapsar" : "editar"}`}
        className="w-full flex items-center gap-3 p-4 min-h-[64px] text-left rounded-2xl outline-none
          focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{nombre}</p>
          <p className={`text-xs tabular-nums truncate ${abierto ? "text-amber-200/90" : "text-slate-500"}`}>
            {abierto ? resumirFranjas(diaNormalizado) : "Cerrado"}
          </p>
        </div>
        <span className={`text-slate-500 transition-transform ${expandido ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
        <span onClick={(event) => event.stopPropagation()}>
          <Switch.Root
            checked={abierto}
            onCheckedChange={(checked) => alternar(checked)}
            onClick={(event) => event.stopPropagation()}
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
        </span>
      </button>
      {abierto && expandido ? (
        <div className="space-y-4 px-4 pb-4">
          <div role="group" aria-label="¿Cómo trabajás este día?">
            <p className="text-xs font-semibold text-slate-300 mb-2">¿Cómo trabajás?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={modo === "corrido"}
                onClick={() => cambiarModo(false)}
                className={`min-h-[48px] px-3 rounded-xl text-xs font-bold transition-colors
                  ${modo === "corrido"
                    ? "bg-amber-400 text-slate-900 shadow"
                    : "border border-white/15 text-slate-300 hover:bg-white/10"}`}
              >
                Corrido
                <span className="block font-normal opacity-80">de corrido</span>
              </button>
              <button
                type="button"
                aria-pressed={modo === "cortado"}
                onClick={() => cambiarModo(true)}
                className={`min-h-[48px] px-3 rounded-xl text-xs font-bold transition-colors
                  ${modo === "cortado"
                    ? "bg-amber-400 text-slate-900 shadow"
                    : "border border-white/15 text-slate-300 hover:bg-white/10"}`}
              >
                Cortado
                <span className="block font-normal opacity-80">con descanso</span>
              </button>
            </div>
          </div>
          {primera === undefined ? null : (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {modo === "cortado" ? "Primer turno" : "Turno"}
              </p>
              <SelectorHoraChips
                id={`${dia}-abre`}
                etiqueta="Abrís"
                valor={primera.openMinutes}
                onChange={(minutos) => cambiarExtremo(0, "openMinutes", minutos)}
              />
              <SelectorHoraChips
                id={`${dia}-cerras`}
                etiqueta="Cerrás"
                valor={primera.closeMinutes}
                onChange={(minutos) => cambiarExtremo(0, "closeMinutes", minutos)}
              />
            </div>
          )}
          {segunda === undefined ? null : (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Segundo turno</p>
              <SelectorHoraChips
                id={`${dia}-volves`}
                etiqueta="Volvés"
                valor={segunda.openMinutes}
                onChange={(minutos) => cambiarExtremo(1, "openMinutes", minutos)}
              />
              <SelectorHoraChips
                id={`${dia}-terminas`}
                etiqueta="Terminás"
                valor={segunda.closeMinutes}
                onChange={(minutos) => cambiarExtremo(1, "closeMinutes", minutos)}
              />
            </div>
          )}
          {error !== null ? (
            <p className="text-xs text-red-400 font-medium" role="alert">{error}</p>
          ) : null}
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
