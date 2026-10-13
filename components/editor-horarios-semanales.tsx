"use client";

import { useState } from "react";

import { DAY_ORDER, dayLabel, type DayKey, type DayRange } from "@/lib/staff/schedule";
import
{
  convertirHorariosAUI,
  errorDeFranjas,
  PRESET_CORRIDO,
  PRESET_CORTADO,
  PRESET_SABADO,
  resumenSemana,
  serializarDia,
  type SemanaUI,
} from "@/lib/horarios/modelo-ui";
import FilaDiaHorario from "./fila-dia-horario";

interface EditorHorariosSemanalesProps
{
  /** Horarios crudos iniciales (string, array o null por día). */
  readonly inicial: unknown;
  /**
   * Server Action que recibe el FormData con 7 campos (`lun`...`dom`).
   * Si se omite, renderiza solo los campos (para embeber en otro form).
   */
  readonly action?: (formData: FormData) => Promise<void>;
  /** Etiqueta del botón de guardado. */
  readonly submitLabel?: string;
}

/**
 * Editor visual semanal: sliders por día + presets + resumen.
 *
 * Serializa a 7 hidden inputs (`lun`...`dom` con `"09:00-13:00, 15:00-20:00"`
 * o `""` = cerrado), el mismo contrato que ya esperan
 * `actualizarHorariosNegocio` y `actualizarHorariosStaff`. Sin cambios
 * de backend: la validación (`validarHorariosStaff`) sigue igual.
 *
 * @param inicial Horarios crudos para precargar el editor.
 * @param action Server Action opcional (sin ella, solo campos embebidos).
 * @param submitLabel Texto del botón de guardado.
 */
export default function EditorHorariosSemanales({ inicial, action, submitLabel }: EditorHorariosSemanalesProps)
{
  const [semana, setSemana] = useState<SemanaUI>(() => convertirHorariosAUI(inicial));
  const [errorSemana, setErrorSemana] = useState<string | null>(null);

  /** Actualiza las franjas de un día. */
  function cambiarDia(dia: DayKey, franjas: DayRange[]): void
  {
    setSemana((previa) => ({ ...previa, [dia]: franjas }));
    setErrorSemana(null);
  }

  /** Aplica jornada corrida (9 a 19) de lunes a sábado. */
  function aplicarCorrido(): void
  {
    setSemana((previa) => aplicarPreset(previa, [...PRESET_CORRIDO], true));
    setErrorSemana(null);
  }

  /** Aplica jornada cortada (9 a 13 y 15 a 20) de lunes a viernes. */
  function aplicarCortado(): void
  {
    setSemana((previa) => aplicarPreset(previa, [...PRESET_CORTADO], false));
    setErrorSemana(null);
  }

  /** Copia el lunes al resto de los días. */
  function copiarLunes(): void
  {
    setSemana((previa) =>
    {
      const lunes = previa.lun.map((franja) => ({ ...franja }));
      const copia = { ...previa } as SemanaUI;

      for (const dia of DAY_ORDER)
      {
        if (dia !== "lun")
        {
          copia[dia] = lunes.map((franja) => ({ ...franja }));
        }
      }

      return copia;
    });
    setErrorSemana(null);
  }

  const errores = DAY_ORDER.filter((dia) => errorDeFranjas(semana[dia]) !== null);

  const campos = (
    <>
      <div className="space-y-2">
        {DAY_ORDER.map((dia) => (
          <FilaDiaHorario key={dia} dia={dia} franjas={semana[dia]} onChange={(franjas) => cambiarDia(dia, franjas)} />
        ))}
      </div>
      {DAY_ORDER.map((dia) => (
        <input key={dia} type="hidden" name={dia} value={serializarDia(semana[dia])} aria-label={dayLabel(dia)} />
      ))}
    </>
  );

  const cuerpo = (
    <div className="space-y-3">
      <p className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl p-3" aria-live="polite">
        {resumenSemana(semana)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={aplicarCorrido}
          className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15 text-slate-300
            hover:bg-white/10 transition-colors min-h-[44px]"
        >
          Corrido 9 a 19 (Lun a Sáb)
        </button>
        <button
          type="button"
          onClick={aplicarCortado}
          className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15 text-slate-300
            hover:bg-white/10 transition-colors min-h-[44px]"
        >
          Cortado 9 a 13 y 15 a 20 (Lun a Vie)
        </button>
        <button
          type="button"
          onClick={copiarLunes}
          className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15 text-slate-300
            hover:bg-white/10 transition-colors min-h-[44px]"
        >
          Copiar lunes a todos
        </button>
      </div>
      {campos}
      {errorSemana !== null ? (
        <p className="text-xs text-red-400 font-semibold" role="alert">{errorSemana}</p>
      ) : null}
    </div>
  );

  if (action === undefined)
  {
    return cuerpo;
  }

  return (
    <form
      action={async (formData: FormData) =>
      {
        if (errores.length > 0)
        {
          setErrorSemana("Revisá los días marcados en rojo antes de guardar.");
          return;
        }

        setErrorSemana(null);
        await action(formData);
      }}
      className="space-y-3"
    >
      {cuerpo}
      <button
        type="submit"
        className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
          hover:bg-blue-700 transition-colors min-h-[44px]"
      >
        {submitLabel ?? "Guardar horarios"}
      </button>
    </form>
  );
}

/**
 * Aplica un preset a los días laborales, preservando sábado y domingo.
 *
 * @param previa Semana actual.
 * @param preset Franjas del preset.
 * @param incluirSabado Si incluye el sábado en el preset.
 * @return Semana nueva con el preset aplicado.
 */
function aplicarPreset(previa: SemanaUI, preset: DayRange[], incluirSabado: boolean): SemanaUI
{
  const copia = { ...previa } as SemanaUI;

  for (const dia of DAY_ORDER)
  {
    if (dia === "dom")
    {
      copia[dia] = [];
    }
    else if (dia === "sáb")
    {
      copia[dia] = incluirSabado
        ? preset.map((franja) => ({ ...franja }))
        : [...PRESET_SABADO].map((franja) => ({ ...franja }));
    }
    else
    {
      copia[dia] = preset.map((franja) => ({ ...franja }));
    }
  }

  return copia;
}
