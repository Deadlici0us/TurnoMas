"use client";

import { useActionState } from "react";

/** Opción de servicio para el selector del perfil. */
export interface ServicioOpcion
{
  readonly id: string;
  readonly nombre: string;
}

interface PerfilStaffFormProps
{
  /** Server Action que recibe descripción + servicios (checkbox `servicios`). */
  readonly action: (prev: string | null, formData: FormData) => Promise<string | null>;
  /** Descripción actual del profesional (null si vacía). */
  readonly descripcion: string | null;
  /** Catálogo de servicios del negocio. */
  readonly servicios: readonly ServicioOpcion[];
  /** Servicios que hoy brinda el profesional. */
  readonly seleccionados: readonly string[];
}

/**
 * Formulario de perfil del profesional: descripción + servicios que brinda.
 *
 * La descripción es opcional (máx 280). Los servicios se reemplazan por
 * completo al guardar; sin ninguno marcado, el portal no le ofrece turnos.
 */
export default function PerfilStaffForm(
  { action, descripcion, servicios, seleccionados }: PerfilStaffFormProps,
)
{
  const [error, formAction, pending] = useActionState(action, null);
  const marcados = new Set(seleccionados);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="staff-descripcion" className="block text-sm font-medium text-ink">
          Descripción breve <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="staff-descripcion"
          name="descripcion"
          rows={3}
          maxLength={280}
          defaultValue={descripcion ?? ""}
          placeholder="Contá qué hacés y tu especialidad"
          className="ui-textarea"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Servicios que brinda</legend>
        {servicios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Todavía no cargaste servicios. Creá uno en la sección Servicios para asignarlo.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {servicios.map((servicio) => (
              <label
                key={servicio.id}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2
                  text-sm text-ink hover:bg-surface cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="servicios"
                  value={servicio.id}
                  defaultChecked={marcados.has(servicio.id)}
                  className="ui-checkbox"
                />
                <span>{servicio.nombre}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {error !== null ? (
        <p role="alert" className="ui-alert ui-alert-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="ui-btn ui-btn-primary"
      >
        {pending ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
