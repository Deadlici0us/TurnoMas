"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import type { ToastItem, ToastTone } from "./toast-types";

const DURACION_POR_DEFECTO = 4000;

const ESTILOS: Record<ToastTone, { readonly borde: string; readonly fondo: string;
  readonly Icono: typeof CheckCircle2 }> = {
  success: { borde: "border-l-success", fondo: "bg-success-soft", Icono: CheckCircle2 },
  error: { borde: "border-l-danger", fondo: "bg-danger-soft", Icono: AlertCircle },
  warning: { borde: "border-l-warning", fondo: "bg-warning-soft", Icono: AlertTriangle },
  info: { borde: "border-l-info", fondo: "bg-info-soft", Icono: Info },
};

interface ToastProps
{
  readonly item: ToastItem;
  readonly leaving: boolean;
  readonly onDismiss: (id: number) => void;
}

/**
 * Tarjeta de notificación con entrada/salida animada y pausa al hover.
 *
 * @param props Toast a mostrar y callback de cierre.
 * @return Notificación accesible.
 */
export default function Toast({ item, leaving, onDismiss }: ToastProps)
{
  const tono = item.tone ?? "info";
  const estilo = ESTILOS[tono];
  const Icono = estilo.Icono;
  const [pausado, setPausado] = useState(false);
  const restante = useRef(item.duration ?? DURACION_POR_DEFECTO);

  useEffect(() =>
  {
    if (leaving || pausado)
    {
      return;
    }

    const inicio = Date.now();
    const temporizador = setTimeout(() =>
    {
      onDismiss(item.id);
    }, restante.current);

    return () =>
    {
      clearTimeout(temporizador);
      restante.current -= Date.now() - inicio;
    };
  }, [item.id, leaving, onDismiss, pausado]);

  return (
    <div
      role={tono === "error" || tono === "warning" ? "alert" : "status"}
      aria-live={tono === "error" || tono === "warning" ? "assertive" : "polite"}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className={`pointer-events-auto flex w-full max-w-[300px] items-start gap-3 rounded-lg
        border-l-8 px-4 py-3 text-navy ${estilo.borde} ${estilo.fondo}
        ${leaving ? "ui-toast-leave" : "ui-toast-enter"}`}
      style={{ boxShadow: "var(--shadow-toast)" }}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {item.title !== undefined && item.title.length > 0 ? (
          <p className="font-heading text-sm font-semibold">{item.title}</p>
        ) : null}
        <p className="text-sm text-navy/85">{item.message}</p>
        {item.action !== undefined ? (
          <button
            type="button"
            onClick={() =>
            {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
