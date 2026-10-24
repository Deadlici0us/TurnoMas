import
{
  actualizarFotoStaff,
  actualizarHorariosStaff,
  actualizarPerfilStaff,
  agregarStaff,
  cambiarEstadoStaff,
  eliminarStaff,
  subirFotoStaff,
} from "./actions";
import { Clock, UserRound } from "lucide-react";
import type { ActionResult } from "@/lib/actions/action-result";
import ActionForm from "@/components/ui/action-form";
import PageHeader from "@/components/ui/page-header";
import SubmitButton from "@/components/ui/submit-button";
import EditorHorariosSemanales from "@/components/editor-horarios-semanales";
import ListaFiltrable from "@/components/lista-filtrable";
import FotoStaffUploader from "@/components/foto-staff-uploader";
import PerfilStaffForm from "@/components/perfil-staff-form";
import StaffDeleteForm from "@/components/staff-delete-form";
import { getDashboardData } from "@/lib/dashboard/queries";
import { calcularResumenTurnosPorStaff } from "@/lib/staff/resumen-turnos";
import type { TurnoResumenRow } from "@/lib/staff/resumen-turnos";
import { DAY_ORDER } from "@/lib/staff/schedule";

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
  readonly activo?: boolean | null;
  readonly horarios?: unknown;
  readonly foto_url?: string | null;
  readonly descripcion?: string | null;
}

interface ServicioRow
{
  readonly id: string;
  readonly nombre: string;
}

interface AsociacionRow
{
  readonly staffId: string;
  readonly servicioId: string;
}

async function crearStaff(formData: FormData): Promise<ActionResult<void>>
{
  "use server";

  const nombreCrudo = formData.get("nombre");

  return agregarStaff(typeof nombreCrudo === "string" ? nombreCrudo : "");
}

async function alternarStaff(staffId: string, activo: boolean): Promise<ActionResult<void>>
{
  "use server";

  return cambiarEstadoStaff(staffId, activo);
}

async function quitarStaff(staffId: string): Promise<ActionResult<void>>
{
  "use server";

  return eliminarStaff(staffId);
}

async function guardarHorarios(staffId: string, formData: FormData): Promise<ActionResult<void>>
{
  "use server";

  const horarios: Record<string, unknown> = {};

  for (const day of DAY_ORDER)
  {
    const valorCrudo = formData.get(day);

    horarios[day] = typeof valorCrudo === "string" ? valorCrudo : "";
  }

  return actualizarHorariosStaff(staffId, horarios);
}

async function guardarPerfil(
  staffId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null>
{
  "use server";

  const result = await actualizarPerfilStaff(
    staffId,
    formData.get("descripcion"),
    formData.getAll("servicios"),
  );

  return result.ok ? null : result.error;
}

async function subirFoto(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>>
{
  "use server";

  return subirFotoStaff(staffId, formData);
}

async function quitarFoto(staffId: string): Promise<ActionResult<void>>
{
  "use server";

  return actualizarFotoStaff(staffId, null);
}

export default async function StaffPage()
{
  const { data: dashboard } = await getDashboardData();
  const servicios = (dashboard.servicios as ServicioRow[]).map((s) => ({ id: s.id, nombre: s.nombre }));
  const asociaciones = (dashboard as { asociaciones?: AsociacionRow[] }).asociaciones ?? [];
  const resumenTurnos = calcularResumenTurnosPorStaff(
    (dashboard.turnos as TurnoResumenRow[] | undefined) ?? [],
  );

  return (
    <div>
      <PageHeader
        title="Equipo"
        subtitle="Profesionales del negocio y sus horarios."
      />
      <ActionForm
        action={crearStaff}
        successMessage="Profesional agregado."
        className="ui-card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:p-6"
      >
        <input
          type="text"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          placeholder="Nombre del profesional"
          className="ui-input flex-1"
        />
        <SubmitButton pendingLabel="Agregando...">Agregar profesional</SubmitButton>
      </ActionForm>
      <ListaFiltrable
        claseLista="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
        items={(dashboard.staff as StaffRow[]).map((member) =>
        {
          const resumen = resumenTurnos.get(member.id) ?? { total: 0, proximos: 0 };
          const conHistorial = resumen.total > 0;
          const confirmacion = member.activo === false
            ? undefined
            : conHistorial
              ? resumen.proximos > 0
                ? `Tiene ${resumen.proximos} turno${resumen.proximos === 1 ? "" : "s"} próximo${resumen.proximos === 1 ? "" : "s"}. `
                  + "No recibirá nuevas reservas, pero esos turnos seguirán agendados. ¿Desactivar?"
                : `Tiene ${resumen.total} turno${resumen.total === 1 ? "" : "s"} en el historial. `
                  + "Se conservarán. ¿Desactivar?"
              : undefined;

          return {
            key: member.id,
            busqueda: [member.nombre],
            contenido: (
          <div className="ui-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-warning-soft
                font-heading font-bold text-[#7a5200]">
                {member.nombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-bold text-ink">{member.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {member.activo === false ? "Inactivo" : "Activo"}
                </p>
                {conHistorial ? (
                  <p className="text-xs text-muted-foreground">Con historial: solo desactivar.</p>
                ) : null}
              </div>
              <ActionForm
                action={alternarStaff.bind(null, member.id, member.activo === false)}
                successMessage={member.activo === false ? "Profesional activado." : "Profesional desactivado."}
                confirmMessage={confirmacion}
              >
                <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                  {member.activo === false ? "Activar" : "Desactivar"}
                </SubmitButton>
              </ActionForm>
              {conHistorial ? null : (
                <StaffDeleteForm
                  action={quitarStaff.bind(null, member.id)}
                  nombre={member.nombre}
                />
              )}
            </div>
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <section
                aria-labelledby={`perfil-staff-${member.id}`}
                className="rounded-lg border border-line bg-surface p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full
                      bg-info-soft text-primary"
                  >
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 id={`perfil-staff-${member.id}`} className="text-sm font-semibold text-ink">
                      Perfil
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Foto, descripción y servicios que brinda.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <FotoStaffUploader
                    staffId={member.id}
                    nombre={member.nombre}
                    fotoUrl={member.foto_url ?? null}
                    subir={subirFoto.bind(null, member.id)}
                    quitar={quitarFoto.bind(null, member.id)}
                  />
                  <PerfilStaffForm
                    action={guardarPerfil.bind(null, member.id)}
                    descripcion={member.descripcion ?? null}
                    servicios={servicios}
                    seleccionados={asociaciones
                      .filter((par) => par.staffId === member.id)
                      .map((par) => par.servicioId)}
                  />
                </div>
              </section>
              <section
                aria-labelledby={`horarios-staff-${member.id}`}
                className="rounded-lg border border-line bg-surface p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full
                      bg-info-soft text-primary"
                  >
                    <Clock className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 id={`horarios-staff-${member.id}`} className="text-sm font-semibold text-ink">
                      Horarios por día
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Abrí cada día con el interruptor y elegí la hora con el reloj.
                      Podés agregar un segundo turno si corta al mediodía.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <EditorHorariosSemanales
                    inicial={member.horarios}
                    action={guardarHorarios.bind(null, member.id)}
                    submitLabel="Guardar horarios"
                  />
                </div>
              </section>
            </div>
          </div>
            ),
          };
        })}
        placeholder="Buscar profesional por nombre"
        vacioSinDatos="Todavía no agregaste profesionales."
        vacioSinCoincidencias="Ningún profesional coincide con la búsqueda."
      />
    </div>
  );
}
