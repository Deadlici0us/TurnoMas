import { cambiarEstadoServicio, eliminarServicio, guardarServicio } from "./actions";
import FormularioServicio from "@/components/formulario-servicio";
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
  readonly remarketing?: boolean | null;
  readonly remarketing_dias?: number | null;
  readonly activo?: boolean | null;
}

async function crearServicio(_prev: string | null, formData: FormData): Promise<string | null>
{
  "use server";

  try
  {
    await guardarServicio(null, formData);
  }
  catch (error)
  {
    return error instanceof Error ? error.message : "No pudimos guardar el servicio. Probá de nuevo.";
  }

  return null;
}

async function editarServicio(
  servicioId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null>
{
  "use server";

  try
  {
    await guardarServicio(servicioId, formData);
  }
  catch (error)
  {
    return error instanceof Error ? error.message : "No pudimos guardar el servicio. Probá de nuevo.";
  }

  return null;
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

export default async function ServiciosPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Servicios</h1>
        <p className="text-slate-400 mt-1 text-sm">Duración, precios y seña por servicio.</p>
      </div>
      <FormularioServicio action={crearServicio} titulo="Nuevo servicio" cta="Agregar servicio" />

        {(dashboard.servicios as ServicioRow[]).map((servicio) => (
          <div key={servicio.id} className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                {servicio.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-100">
                  {servicio.nombre}
                  {servicio.activo === false ? (
                    <span className="ml-2 text-xs font-semibold text-slate-400">(Inactivo)</span>
                  ) : null}
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-400">
                  <span>Duración: {servicio.duracion_min} min</span>
                  <span>Precio: $ {servicio.precio_base.toLocaleString("es-AR")}</span>
                  {servicio.precio_promocional !== null && (
                    <span>Promo: $ {servicio.precio_promocional.toLocaleString("es-AR")}</span>
                  )}
                  <span>{servicio.sena_requerida ? `Seña ${servicio.sena_porcentaje}%` : "Sin seña"}</span>
                  <span>{servicio.remarketing === false
                    ? "Sin remarketing"
                    : `Remarketing ${servicio.remarketing_dias ?? 30}d`}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <form action={alternarServicio.bind(null, servicio.id, servicio.activo === false)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                        text-slate-400 hover:bg-white/10 transition-colors"
                    >
                      {servicio.activo === false ? "Activar" : "Desactivar"}
                    </button>
                  </form>
                  <form action={borrarServicio.bind(null, servicio.id)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-red-500/30
                        text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
                <details className="border border-white/10 rounded-lg">
                  <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10">
                    Editar
                  </summary>
                  <div className="p-4 border-t border-white/10">
                    <FormularioServicio
                      action={editarServicio.bind(null, servicio.id)}
                      titulo="Editar servicio"
                      cta="Guardar cambios"
                      servicio={servicio}
                    />
                  </div>
                </details>
              </div>
          </div>
        ))}
    </div>
  );
}
