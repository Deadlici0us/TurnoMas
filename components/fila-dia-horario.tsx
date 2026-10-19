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
import DetalleDiaHorario from "./detalle-dia-horario";

interface FilaDiaHorarioProps
{
  readonly dia: DayKey;
  readonly franjas: readonly DayRange[];
  readonly onChange: (franjas: DayRange[]) => void;
}

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
  const resumen = abierto ? resumirFranjas(diaNormalizado) : "Cerrado";
  const accion = expandido ? "colapsar" : "editar";
  const claseContenedor = abierto ? "border-amber-400/30 bg-amber-400/5" : "border-white/10 bg-white/5";
  const claseResumen = abierto ? "text-amber-200/90" : "text-slate-500";
  const claseFlecha = expandido ? "rotate-180" : "";
  const claseThumb = abierto ? "translate-x-7" : "translate-x-1";
  const detalleVisible = abierto && expandido;

  /** Abre el día con jornada corrida. */
  function abrirDia(): void
  {
    onChange([...PRESET_CORRIDO]);
  }

  /** Cierra el día completo. */
  function cerrarDia(): void
  {
    onChange([]);
  }

  return (
    <div className={`rounded-2xl border transition-colors ${claseContenedor}`}>
      <button
        type="button"
        onClick={() => setExpandido((previo) => !previo)}
        aria-expanded={expandido || !abierto}
        aria-label={`${nombre}: ${resumen}. Tocar para ${accion}`}
        className="w-full flex items-center gap-3 p-4 min-h-[64px] text-left rounded-2xl outline-none
          focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{nombre}</p>
          <p className={`text-xs tabular-nums truncate ${claseResumen}`}>
            {resumen}
          </p>
        </div>
        <span className={`text-slate-500 transition-transform ${claseFlecha}`} aria-hidden="true">
          ▾
        </span>
        <span>
          <Switch.Root
            checked={abierto}
            onCheckedChange={() => (abierto ? cerrarDia() : abrirDia())}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${nombre} abierto`}
            className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-white/15 transition-colors
              data-checked:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-500
              focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 outline-none"
          >
            <Switch.Thumb
              className={`block size-6 rounded-full bg-white shadow transition-transform ${claseThumb}`}
            />
          </Switch.Root>
        </span>
      </button>
      {detalleVisible && (
        <DetalleDiaHorario
          dia={dia}
          franjas={diaNormalizado}
          modo={modo}
          error={error}
          onChange={onChange}
        />
      )}
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
