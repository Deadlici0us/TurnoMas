"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { ActionResult } from "@/lib/actions/action-result";
import { useToast } from "./ui/use-toast";

interface StaffDeleteFormProps
{
  readonly action: () => Promise<ActionResult<unknown> | void>;
  readonly nombre: string;
}

/** Form de eliminar con confirmación, solo para profesionales sin turnos. */
export default function StaffDeleteForm({ action, nombre }: StaffDeleteFormProps)
{
  const { showToast } = useToast();
  const router = useRouter();
  const [pendiente, setPendiente] = useState(false);

  async function ejecutar(event: FormEvent<HTMLFormElement>): Promise<void>
  {
    event.preventDefault();

    if (pendiente)
    {
      return;
    }

    if (!window.confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`))
    {
      return;
    }

    setPendiente(true);

    try
    {
      const result = await action();

      if (result !== undefined && !result.ok)
      {
        showToast({ tone: "error", title: "No se pudo eliminar", message: result.error });
        router.refresh();

        return;
      }

      showToast({ tone: "success", title: "Listo", message: "Profesional eliminado." });
      router.refresh();
    }
    catch (error)
    {
      const message = error instanceof Error && error.message.length > 0
        ? error.message
        : "No pudimos eliminar al profesional. Probá de nuevo.";

      showToast({ tone: "error", title: "No se pudo eliminar", message });
    }
    finally
    {
      setPendiente(false);
    }
  }

  return (
    <form onSubmit={(event) => { void ejecutar(event); }}>
      <button
        type="submit"
        disabled={pendiente}
        className="ui-btn ui-btn-danger ui-btn-sm"
      >
        {pendiente ? "Eliminando..." : "Eliminar"}
      </button>
    </form>
  );
}
