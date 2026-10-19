"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { useToast } from "./use-toast";

export interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">
{
  readonly action: () => Promise<void>;
  readonly successMessage: string;
  readonly errorMessage?: string;
  readonly pendingLabel?: string;
  readonly children: ReactNode;
}

/**
 * Botón que dispara una acción asíncrona con spinner y toast de resultado.
 *
 * @param props Acción, mensajes y contenido del botón.
 * @return Botón con feedback de éxito o error.
 */
export default function ActionButton({
  action,
  successMessage,
  errorMessage = "No pudimos completar la acción. Probá de nuevo.",
  pendingLabel = "Procesando...",
  children,
  className = "ui-btn ui-btn-outline",
  disabled,
  ...props
}: ActionButtonProps)
{
  const [pendiente, setPendiente] = useState(false);
  const { showToast } = useToast();

  async function ejecutar(): Promise<void>
  {
    if (pendiente)
    {
      return;
    }

    setPendiente(true);

    try
    {
      await action();
      showToast({ tone: "success", title: "Listo", message: successMessage });
    }
    catch (error)
    {
      const mensaje = error instanceof Error && error.message.length > 0
        ? error.message
        : errorMessage;

      showToast({ tone: "error", title: "No se pudo completar", message: mensaje });
    }
    finally
    {
      setPendiente(false);
    }
  }

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      onClick={() => { void ejecutar(); }}
      disabled={pendiente || disabled === true}
      aria-busy={pendiente}
      className={className}
    >
      {pendiente ? (
        <>
          <span className="ui-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : children}
    </button>
  );
}
