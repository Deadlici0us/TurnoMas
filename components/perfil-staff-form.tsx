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
        <label htmlFor="staff-descripcion" className="block text-sm font-medium text-slate-300">
          Descripción breve <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <textarea
          id="staff-descripcion"
          name="descripcion"
          rows={3}
          maxLength={280}
          defaultValue={descripcion ?? ""}
          placeholder="Contá qué hacés y tu especialidad"
          className="w-full px-4 py-2 bg-white/5 border border-white/15 text-slate-100 rounded-lg
            outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">Servicios que brinda</legend>
        {servicios.length === 0 ? (
          <p className="text-xs text-slate-400">
            Todavía no cargaste servicios. Creá uno en la sección Servicios para asignarlo.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {servicios.map((servicio) => (
              <label
                key={servicio.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2
                  text-sm text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="servicios"
                  value={servicio.id}
                  defaultChecked={marcados.has(servicio.id)}
                  className="size-4 accent-blue-600"
                />
                <span>{servicio.nombre}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {error !== null ? (
        <p role="alert" className="text-sm font-semibold text-red-300 bg-red-500/10 border
          border-red-500/30 rounded-lg p-3">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
          hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar perfil"}
      </button>
    </form>
  );
}
