import Link from "next/link";
import { redirect } from "next/navigation";

import { crearTurnoManual } from "./actions";
import FormularioTurnoManual from "@/components/formulario-turno-manual";
import type { ClienteTurnoManual } from "@/components/formulario-turno-manual";
import PageHeader from "@/components/ui/page-header";
import { getDashboardData } from "@/lib/dashboard/queries";
import type
{
  PortalAsociacion,
  PortalBloqueo,
  PortalServicio,
  PortalStaff,
  PortalTurno,
} from "@/lib/portal/types";
import { retieneSlot } from "@/lib/reservas/disponibilidad";

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliza un JSONB de horarios a un registro seguro para la UI. */
function asRecord(value: unknown): Record<string, unknown>
{
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

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

/** Alta manual de un turno con el mismo wizard que usa el cliente. */
export default async function NuevoTurnoPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ fecha?: string; clienteId?: string }>;
})
{
  const params = await searchParams;
  const { data: dashboard } = await getDashboardData();
  const negocio = asRecord(dashboard.negocio);
  const clienteId = typeof params.clienteId === "string" ? params.clienteId : null;
  const clientes = dashboard.clientes as ClienteTurnoManual[];
  const clienteInicial = clienteId === null
    ? null
    : clientes.find((cliente) => cliente.id === clienteId) ?? null;
  const fechaInicial = typeof params.fecha === "string" && FECHA_PATTERN.test(params.fecha)
    ? params.fecha
    : null;

  const staff: PortalStaff[] = (dashboard.staff as Array<Record<string, unknown>>)
    .filter((profesional) => profesional.activo !== false)
    .map((profesional) => ({
      id: String(profesional.id),
      nombre: typeof profesional.nombre === "string" ? profesional.nombre : "Profesional",
      horarios: asRecord(profesional.horarios),
      activo: profesional.activo !== false,
      fotoUrl: typeof profesional.foto_url === "string" ? profesional.foto_url : null,
      descripcion: typeof profesional.descripcion === "string" ? profesional.descripcion : null,
    }));

  const servicios: PortalServicio[] = (dashboard.servicios as Array<Record<string, unknown>>)
    .filter((servicio) => servicio.activo !== false)
    .map((servicio) => ({
      id: String(servicio.id),
      nombre: typeof servicio.nombre === "string" ? servicio.nombre : "Servicio",
      duracionMin: typeof servicio.duracion_min === "number" ? servicio.duracion_min : 0,
      precioBase: typeof servicio.precio_base === "number" ? servicio.precio_base : 0,
      precioPromocional: typeof servicio.precio_promocional === "number"
        ? servicio.precio_promocional
        : null,
      senaRequerida: servicio.sena_requerida === true,
      senaPorcentaje: typeof servicio.sena_porcentaje === "number" ? servicio.sena_porcentaje : 0,
    }));

  const ahoraMs = new Date().getTime();
  const turnos: PortalTurno[] = (dashboard.turnos as Array<Record<string, unknown>>)
    .filter((turno) => retieneSlot(
      String(turno.estado ?? ""),
      typeof turno.created_at === "string" ? turno.created_at : "",
      ahoraMs,
    ))
    .map((turno) => ({
      staffId: String(turno.staff_id),
      servicioId: String(turno.servicio_id),
      inicio: String(turno.inicio),
      fin: typeof turno.fin === "string" ? turno.fin : null,
    }));

  const bloqueos: PortalBloqueo[] = [];

  return (
    <div>
      <PageHeader
        title="Nuevo turno"
        subtitle="Elegí profesional, servicio y horario, y completá los datos del cliente."
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
        asociaciones={dashboard.asociaciones as PortalAsociacion[]}
        turnos={turnos}
        bloqueos={bloqueos}
        horariosNegocio={asRecord(negocio.horarios)}
        clientes={clientes}
        clienteInicial={clienteInicial}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}
