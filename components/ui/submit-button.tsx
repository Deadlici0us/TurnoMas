"use client";

import { useContext } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { ActionFormPendingContext } from "./action-form-pending-context";

export interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>
{
  readonly children: ReactNode;
  readonly pendingLabel?: string;
}

/**
 * Botón de envío con spinner y bloqueo mientras la acción está pendiente.
 *
 * @param props Etiqueta normal, etiqueta pendiente y clases del botón.
 * @return Botón accesible con estado de carga.
 */
export default function SubmitButton({
  children,
  pendingLabel = "Guardando...",
  className = "ui-btn ui-btn-primary",
  disabled,
  ...props
}: SubmitButtonProps)
{
  const { pending: pendingForm } = useFormStatus();
  const pendingContext = useContext(ActionFormPendingContext);
  const pending = pendingContext ?? pendingForm;

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={pending || disabled === true}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <>
          <span className="ui-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : children}
    </button>
  );
}
