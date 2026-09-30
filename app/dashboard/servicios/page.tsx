import { cambiarEstadoServicio, eliminarServicio, guardarServicio } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";

interface ServicioRow
{
  readonly id: string;
  readonly nombre: string;
  readonly duracion_min: number;
  readonly precio_base: number;
  readonly precio_promocional: number | null;
  readonly sena_requerida: boolean;
  readonly sena_porcentaje: number;
  readonly activo?: boolean | null;
}

async function crearServicio(formData: FormData): Promise<void>
{
  "use server";

  await guardarServicio(null, formData);
}

async function editarServicio(servicioId: string, formData: FormData): Promise<void>
{
  "use server";

  await guardarServicio(servicioId, formData);
}

async function borrarServicio(servicioId: string): Promise<void>
{
  "use server";

  await eliminarServicio(servicioId);
}

async function alternarServicio(servicioId: string, activo: boolean): Promise<void>
{
  "use server";

  await cambiarEstadoServicio(servicioId, activo);
}

function CamposServicio({ servicio }: { servicio?: ServicioRow })
{
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block text-sm text-slate-600 sm:col-span-2">
        Nombre
        <input
          type="text"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          defaultValue={servicio?.nombre ?? ""}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </label>
      <label className="block text-sm text-slate-600">
        Duración (min)
        <input
          type="number"
          name="duracionMin"
          required
          min={1}
          defaultValue={servicio?.duracion_min ?? 30}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </label>
      <label className="block text-sm text-slate-600">
        Precio base
        <input
          type="number"
          name="precioBase"
          required
          min={1}
          defaultValue={servicio?.precio_base ?? ""}
          placeholder="Ej: 15000"
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </label>
      <label className="block text-sm text-slate-600">
        Precio promo (opcional)
        <input
          type="number"
          name="precioPromocional"
          min={1}
          defaultValue={servicio?.precio_promocional ?? ""}
          placeholder="Vacío = sin promo"
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="senaRequerida"
          defaultChecked={servicio?.sena_requerida ?? true}
          className="w-4 h-4"
        />
        Exige seña
      </label>
      <label className="block text-sm text-slate-600">
        Seña (%)
        <input
          type="number"
          name="senaPorcentaje"
          required
          min={1}
          max={100}
          defaultValue={servicio?.sena_porcentaje ?? 50}
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </label>
    </div>
  );
}

export default async function ServiciosPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Servicios</h1>
        <p className="text-slate-600 mt-1 text-sm">Duración, precios y seña por servicio.</p>
      </div>
      <form action={crearServicio} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Nuevo servicio</h2>
        <CamposServicio />
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          Agregar servicio
        </button>
      </form>

        {(dashboard.servicios as ServicioRow[]).map((servicio) => (
          <div key={servicio.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                {servicio.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {servicio.nombre}
                  {servicio.activo === false ? (
                    <span className="ml-2 text-xs font-semibold text-slate-500">(Inactivo)</span>
                  ) : null}
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-600">
                  <span>Duración: {servicio.duracion_min} min</span>
                  <span>Precio: $ {servicio.precio_base.toLocaleString("es-AR")}</span>
                  {servicio.precio_promocional !== null && (
                    <span>Promo: $ {servicio.precio_promocional.toLocaleString("es-AR")}</span>
                  )}
                  <span>{servicio.sena_requerida ? `Seña ${servicio.sena_porcentaje}%` : "Sin seña"}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <form action={alternarServicio.bind(null, servicio.id, servicio.activo === false)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                        text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {servicio.activo === false ? "Activar" : "Desactivar"}
                    </button>
                  </form>
                  <form action={borrarServicio.bind(null, servicio.id)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-red-200
                        text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
                <details className="border border-slate-200 rounded-lg">
                  <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Editar
                  </summary>
                  <form action={editarServicio.bind(null, servicio.id)} className="p-4 space-y-4 border-t border-slate-200">
                    <CamposServicio servicio={servicio} />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                        hover:bg-blue-700 transition-colors"
                    >
                      Guardar cambios
                    </button>
                  </form>
                </details>
              </div>
          </div>
        ))}
    </div>
  );
}
