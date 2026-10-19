import Link from "next/link";
import { redirect } from "next/navigation";

import { crearTurnoManual } from "./actions";
import FormularioTurnoManual from "@/components/formulario-turno-manual";
import type { AsociacionTurnoManual, ClienteTurnoManual, ServicioTurnoManual,
  StaffTurnoManual } from "@/components/formulario-turno-manual";
import PageHeader from "@/components/ui/page-header";
import { getDashboardData } from "@/lib/dashboard/queries";
import { claveDiaEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Envuelve la acción de alta manual y vuelve a la agenda en el día creado.
 *
 * @param _prev Estado previo de `useActionState` (sin uso).
 * @param formData Campos del formulario.
 * @return Mensaje de error, o redirige a la agenda al crear el turno.
 */
async function crear(_prev: string | null, formData: FormData): Promise<string | null>
{
  "use server";

  let fecha: string;

  try
  {
    fecha = await crearTurnoManual(formData);
  }
  catch (error)
  {
    return error instanceof Error ? error.message : "No pudimos crear el turno. Probá de nuevo.";
  }

  redirect(`/dashboard/agenda?vista=dia&fecha=${fecha}`);
}

/** Alta manual de un turno desde la agenda o la ficha de un cliente. */
export default async function NuevoTurnoPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ fecha?: string; clienteId?: string }>;
})
{
  const params = await searchParams;
  const { data: dashboard } = await getDashboardData();
  const negocio = dashboard.negocio as { timezone?: unknown; pais?: unknown };
  const timeZone = resolverTimezoneNegocio({ timezone: negocio.timezone, pais: negocio.pais });
  const clienteId = typeof params.clienteId === "string" ? params.clienteId : null;
  const clientes = dashboard.clientes as ClienteTurnoManual[];
  const clienteInicial = clienteId === null
    ? null
    : clientes.find((cliente) => cliente.id === clienteId) ?? null;
  const fechaInicial = typeof params.fecha === "string" && FECHA_PATTERN.test(params.fecha)
    ? params.fecha
    : claveDiaEnZona(new Date(), timeZone);
  const staff = (dashboard.staff as Array<StaffTurnoManual & { readonly activo?: boolean }>)
    .filter((profesional) => profesional.activo !== false)
    .map((profesional) => ({ id: profesional.id, nombre: profesional.nombre }));
  const servicios = (dashboard.servicios as Array<ServicioTurnoManual & { readonly activo?: boolean }>)
    .filter((servicio) => servicio.activo !== false)
    .map((servicio) => ({
      id: servicio.id,
      nombre: servicio.nombre,
      duracion_min: servicio.duracion_min,
      precio_base: servicio.precio_base,
      precio_promocional: servicio.precio_promocional,
    }));

  return (
    <div>
      <PageHeader
        title="Nuevo turno"
        subtitle="Cargá un turno a mano: elegí profesional, servicio, horario y estado."
        actions={(
          <Link href="/dashboard/agenda" className="ui-btn ui-btn-outline">
            Volver a la agenda
          </Link>
        )}
      />
      <FormularioTurnoManual
        action={crear}
        staff={staff}
        servicios={servicios}
        asociaciones={dashboard.asociaciones as AsociacionTurnoManual[]}
        clientes={clientes}
        clienteInicial={clienteInicial}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}
