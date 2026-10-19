"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";

import CamposServicio from "@/components/campos-servicio";
import type { CamposServicioValue } from "@/components/campos-servicio";
import { useToast } from "@/components/ui/use-toast";

interface FormularioServicioProps
{
  readonly action: (prev: string | null, formData: FormData) => Promise<string | null>;
  readonly titulo: string;
  readonly cta: string;
  readonly servicio?: CamposServicioValue & { readonly id?: string };
}

/**
 * Formulario de crear/editar servicio con error visible en es-AR.
 *
 * Las Server Actions de servicios lanzan ante validación, MP
 * desconectado o fallo de Supabase; sin `useActionState` ese throw
 * revienta la página con el error genérico de Next. Acá se muestra
 * el mensaje ("Conectá tu MercadoPago…", "Completá todos los datos…")
 * sin romper la navegación.
 */
export default function FormularioServicio({ action, titulo, cta, servicio }: FormularioServicioProps)
{
  const [error, formAction, pending] = useActionState(action, null);
  const { showToast } = useToast();
  const enviado = useRef(false);

  useEffect(() =>
  {
    if (!enviado.current || pending)
    {
      return;
    }

    enviado.current = false;

    if (error === null)
    {
      showToast({ tone: "success", title: "Listo", message: "Servicio guardado." });
      return;
    }

    showToast({ tone: "error", title: "No se pudo guardar", message: error });
  }, [error, pending, showToast]);

  return (
    <form
      action={formAction}
      onSubmit={() => { enviado.current = true; }}
      className="space-y-4"
    >
      <h2 className="ui-section-title">{titulo}</h2>
      <CamposServicio servicio={servicio} />
      {error !== null && (
        <p role="alert" className="ui-alert ui-alert-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="ui-btn ui-btn-primary">
        {pending ? "Guardando..." : cta}
      </button>
    </form>
  );
}
