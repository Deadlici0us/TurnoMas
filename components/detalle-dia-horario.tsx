"use client";

import type { DayKey, DayRange } from "@/lib/staff/schedule";
import { PRESET_CORRIDO, type ModoJornada } from "@/lib/horarios/modelo-ui";
import SelectorHoraChips from "./selector-hora-chips";

export interface DetalleDiaHorarioProps
{
  readonly dia: DayKey;
  readonly franjas: readonly DayRange[];
  readonly modo: ModoJornada;
  readonly error: string | null;
  readonly onChange: (franjas: DayRange[]) => void;
}

/** Segunda franja sugerida al pasar a cortado (15 a 20). */
const DESCANSO_SUGERIDO: DayRange = { openMinutes: 900, closeMinutes: 1200 };

/**
 * Pasos de edición de un día: corrido/cortado y relojes de apertura y cierre.
 *
 * @param props Día, franjas normalizadas, modo actual, error y aviso de cambio.
 * @return Controles del detalle del día.
 */
export default function DetalleDiaHorario({ dia, franjas, modo, error, onChange }: DetalleDiaHorarioProps)
{
  const primera = franjas[0];
  const segunda = franjas[1];

  /** Pasa la jornada a corrido (un solo turno). */
  function usarCorrido(): void
  {
    if (primera === undefined)
    {
      return;
    }

    onChange([{ ...primera }]);
  }

  /** Pasa la jornada a cortado (dos turnos). */
  function usarCortado(): void
  {
    onChange([
      primera === undefined ? { ...PRESET_CORRIDO[0] } : { ...primera },
      { ...DESCANSO_SUGERIDO },
    ]);
  }

  /** Cambia un extremo de la franja indicada. */
  function cambiarExtremo(indice: number, campo: "openMinutes" | "closeMinutes", minutos: number): void
  {
    onChange(franjas.map((franja, i) => (i === indice ? { ...franja, [campo]: minutos } : { ...franja })));
  }

  return (
    <div className="space-y-4 px-4 pb-4">
      <fieldset className="m-0 min-w-0 border-0 p-0" aria-label="¿Cómo trabajás este día?">
        <p className="text-xs font-semibold text-ink mb-2">
          Paso 1: ¿trabajás de corrido o cortás al mediodía?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={modo === "corrido"}
            onClick={usarCorrido}
            className={`ui-btn ui-btn-sm ${modo === "corrido" ? "bg-primary text-white shadow" : "ui-btn-outline"}`}
          >
            <span className="block">De corrido</span>
            <span className="block font-normal opacity-80">ej: 9 a 19 sin parar</span>
          </button>
          <button
            type="button"
            aria-pressed={modo === "cortado"}
            onClick={usarCortado}
            className={`ui-btn ui-btn-sm ${modo === "cortado" ? "bg-primary text-white shadow" : "ui-btn-outline"}`}
          >
            <span className="block">Corto al mediodía</span>
            <span className="block font-normal opacity-80">ej: 9 a 13 y 15 a 20</span>
          </button>
        </div>
      </fieldset>
      {primera === undefined ? null : (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {modo === "cortado" ? "Paso 2: primera parte del día" : "Paso 2: elegí tus horas"}
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
        <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Paso 3: segunda parte del día
          </p>
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
      {error === null ? null : (
        <p className="text-xs text-danger font-medium" role="alert">{error}</p>
      )}
    </div>
  );
}
