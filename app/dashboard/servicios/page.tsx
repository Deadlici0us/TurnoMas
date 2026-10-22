import { cambiarEstadoServicio, eliminarServicio, guardarServicio } from "./actions";
import ActionForm from "@/components/ui/action-form";
import PageHeader from "@/components/ui/page-header";
import SubmitButton from "@/components/ui/submit-button";
import FormularioServicio from "@/components/formulario-servicio";
import type { ActionResult } from "@/lib/actions/action-result";
import { runAction } from "@/lib/actions/run-action";
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

async function borrarServicio(servicioId: string): Promise<ActionResult<void>>
{
  "use server";

  return runAction("borrarServicio", async () =>
  {
    await eliminarServicio(servicioId);
  });
}

async function alternarServicio(servicioId: string, activo: boolean): Promise<ActionResult<void>>
{
  "use server";

  return runAction("alternarServicio", async () =>
  {
    await cambiarEstadoServicio(servicioId, activo);
  });
}

export default async function ServiciosPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Servicios"
        subtitle="Duración, precios y seña por servicio."
      />
      <div className="ui-card mb-4 p-5 sm:p-6">
        <FormularioServicio action={crearServicio} titulo="Nuevo servicio" cta="Agregar servicio" />
      </div>

        {(dashboard.servicios as ServicioRow[]).map((servicio) => (
          <div key={servicio.id} className="ui-card mb-4 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-info-soft
                font-heading font-bold text-[#0b6e93]">
                {servicio.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink">
                  {servicio.nombre}
                  {servicio.activo === false ? (
                    <span className="ml-2 text-xs font-semibold text-muted-foreground">(Inactivo)</span>
                  ) : null}
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
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
                  <ActionForm
                    action={alternarServicio.bind(null, servicio.id, servicio.activo === false)}
                    successMessage={servicio.activo === false ? "Servicio activado." : "Servicio desactivado."}
                  >
                    <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                      {servicio.activo === false ? "Activar" : "Desactivar"}
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm
                    action={borrarServicio.bind(null, servicio.id)}
                    successMessage="Servicio eliminado."
                  >
                    <SubmitButton className="ui-btn ui-btn-danger ui-btn-sm">
                      Eliminar
                    </SubmitButton>
                  </ActionForm>
                </div>
                <details className="border border-line rounded-lg">
                  <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-ink hover:bg-soft">
                    Editar
                  </summary>
                  <div className="p-4 border-t border-line">
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
