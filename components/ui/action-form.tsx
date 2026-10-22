"use client";

import { useState } from "react";
import type { FormEvent, FormHTMLAttributes, ReactNode } from "react";

import type { ActionResult } from "@/lib/actions/action-result";
import { ActionFormPendingContext } from "./action-form-pending-context";
import { useToast } from "./use-toast";

export interface ActionFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit">
{
  readonly action: (formData: FormData) => Promise<ActionResult<unknown> | void>;
  readonly successMessage: string;
  readonly errorMessage?: string;
  readonly confirmMessage?: string;
  readonly children: ReactNode;
}

/**
 * Formulario que ejecuta una Server Action y muestra feedback animado.
 *
 * Usa `onSubmit` para poder capturar también los errores que devuelve la
 * acción (por ejemplo, la demo de solo lectura) sin romper la navegación.
 *
 * @param props Acción, mensajes y contenido del formulario.
 * @return Formulario con toast de éxito o error.
 */
export default function ActionForm({
  action,
  successMessage,
  errorMessage = "No pudimos completar la acción. Probá de nuevo.",
  confirmMessage,
  children,
  ...props
}: ActionFormProps)
{
  const { showToast } = useToast();
  const [pendiente, setPendiente] = useState(false);

  async function ejecutar(event: FormEvent<HTMLFormElement>): Promise<void>
  {
    event.preventDefault();

    if (pendiente)
    {
      return;
    }

    if (confirmMessage !== undefined && !window.confirm(confirmMessage))
    {
      return;
    }

    setPendiente(true);

    try
    {
      const result = await action(new FormData(event.currentTarget));

      if (result !== undefined && !result.ok)
      {
        showToast({
          tone: "error",
          title: "No se pudo completar",
          message: result.error.length > 0 ? result.error : errorMessage,
        });

        return;
      }

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
    <ActionFormPendingContext.Provider value={pendiente}>
      <form {...props} onSubmit={(event) => { void ejecutar(event); }}>
        {children}
      </form>
    </ActionFormPendingContext.Provider>
  );
}
