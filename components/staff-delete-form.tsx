"use client";

interface StaffDeleteFormProps
{
  readonly action: (formData: FormData) => Promise<void>;
}

/** Form de eliminar con confirmación nativa (solo borra staff sin turnos). */
export default function StaffDeleteForm({ action }: StaffDeleteFormProps)
{
  return (
    <form
      action={action}
      onSubmit={(event) =>
      {
        if (!window.confirm("¿Eliminar a este profesional? Solo se puede si no tiene turnos."))
        {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-semibold px-4 py-2 rounded-lg border border-red-200
          text-red-600 hover:bg-red-50 transition-colors"
      >
        Eliminar
      </button>
    </form>
  );
}
