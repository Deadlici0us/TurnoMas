"use client";

import { useActionState } from "react";

import CamposServicio from "@/components/campos-servicio";
import type { CamposServicioValue } from "@/components/campos-servicio";

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

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="font-semibold text-slate-100">{titulo}</h2>
      <CamposServicio servicio={servicio} />
      {error !== null && (
        <p role="alert" className="text-sm font-semibold text-red-300 bg-red-500/10 border
          border-red-500/30 rounded-lg p-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
          hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {cta}
      </button>
    </form>
  );
}
