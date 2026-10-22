"use client";

import { useState } from "react";

import type { ActionResult } from "@/lib/actions/action-result";
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
import { useToast } from "@/components/ui/use-toast";

interface EditorHorariosSemanalesProps
{
  /** Horarios crudos iniciales (string, array o null por día). */
  readonly inicial: unknown;
  /**
   * Server Action que recibe el FormData con 7 campos (`lun`...`dom`).
   * Si se omite, renderiza solo los campos (para embeber en otro form).
   */
  readonly action?: (formData: FormData) => Promise<ActionResult<unknown> | void>;
  /** Etiqueta del botón de guardado. */
  readonly submitLabel?: string;
}

/**
 * Editor visual semanal: asistente por día + presets + resumen.
 *
 * Cada día es un asistente guiado (switch, modo corrido/cortado con
 * máx 2 franjas, reloj nativo del sistema). Serializa a 7 hidden inputs
 * (`lun`...`dom` con `"09:00-13:00, 15:00-20:00"` o `""` = cerrado),
 * el mismo contrato que ya esperan `actualizarHorariosNegocio` y
 * `actualizarHorariosStaff`. Sin cambios de backend: la validación
 * (`validarHorariosStaff`) sigue igual.
 *
 * @param inicial Horarios crudos para precargar el editor.
 * @param action Server Action opcional (sin ella, solo campos embebidos).
 * @param submitLabel Texto del botón de guardado.
 */
export default function EditorHorariosSemanales({ inicial, action, submitLabel }: EditorHorariosSemanalesProps)
{
  const { showToast } = useToast();
  const [enviando, setEnviando] = useState(false);
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
      <div className="space-y-3">
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
    <div className="space-y-4">
      <div className="rounded-lg border border-info/30 bg-info-soft p-4" aria-live="polite">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0b5f7f]">Cómo queda tu semana</p>
        <p className="text-base font-semibold text-ink mt-0.5">{resumenSemana(semana)}</p>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Si atendés siempre igual, tocá un botón
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={aplicarCorrido}
            className="ui-btn ui-btn-outline ui-btn-sm"
          >
            Trabajo de corrido 9 a 19
          </button>
          <button
            type="button"
            onClick={aplicarCortado}
            className="ui-btn ui-btn-outline ui-btn-sm"
          >
            Corto al mediodía 9 a 13 y 15 a 20
          </button>
          <button
            type="button"
            onClick={copiarLunes}
            className="ui-btn ui-btn-outline ui-btn-sm"
          >
            Copiar el lunes a todos los días
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Consejo: primero tocá un botón rápido y después ajustá solo el día que sea distinto.
        </p>
      </div>
      {campos}
      {errorSemana !== null ? (
        <p className="ui-alert ui-alert-danger text-xs font-semibold"
          role="alert">
          {errorSemana}
        </p>
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
          showToast({ tone: "error", title: "Revisá los horarios", message: "Hay días marcados en rojo." });
          return;
        }

        setErrorSemana(null);
        setEnviando(true);

        try
        {
          const result = await action(formData);

          if (result !== undefined && !result.ok)
          {
            showToast({ tone: "error", title: "No se pudo guardar", message: result.error });
            return;
          }

          showToast({ tone: "success", title: "Listo", message: "Horarios guardados." });
        }
        catch
        {
          showToast({ tone: "error", title: "No se pudo guardar", message: "Probá de nuevo." });
        }
        finally
        {
          setEnviando(false);
        }
      }}
      className="space-y-3"
    >
      {cuerpo}
      <button
        type="submit"
        disabled={enviando}
        className="ui-btn ui-btn-primary w-full sm:w-auto"
      >
        {enviando ? (
          <>
            <span className="ui-spinner" aria-hidden="true" />
            Guardando...
          </>
        ) : (submitLabel ?? "Guardar horarios")}
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
