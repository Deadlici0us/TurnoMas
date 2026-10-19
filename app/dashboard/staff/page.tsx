import
{
  actualizarFotoStaff,
  actualizarHorariosStaff,
  actualizarPerfilStaff,
  agregarStaff,
  cambiarEstadoStaff,
  eliminarStaff,
} from "./actions";
import ActionForm from "@/components/ui/action-form";
import PageHeader from "@/components/ui/page-header";
import SubmitButton from "@/components/ui/submit-button";
import EditorHorariosSemanales from "@/components/editor-horarios-semanales";
import FotoStaffUploader from "@/components/foto-staff-uploader";
import PerfilStaffForm from "@/components/perfil-staff-form";
import StaffDeleteForm from "@/components/staff-delete-form";
import { getDashboardData } from "@/lib/dashboard/queries";
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

async function crearStaff(formData: FormData): Promise<void>
{
  "use server";

  const nombreCrudo = formData.get("nombre");

  await agregarStaff(typeof nombreCrudo === "string" ? nombreCrudo : "");
}

async function alternarStaff(staffId: string, activo: boolean): Promise<void>
{
  "use server";

  await cambiarEstadoStaff(staffId, activo);
}

async function quitarStaff(staffId: string): Promise<void>
{
  "use server";

  await eliminarStaff(staffId);
}

async function guardarHorarios(staffId: string, formData: FormData): Promise<void>
{
  "use server";

  const horarios: Record<string, unknown> = {};

  for (const day of DAY_ORDER)
  {
    const valorCrudo = formData.get(day);

    horarios[day] = typeof valorCrudo === "string" ? valorCrudo : "";
  }

  await actualizarHorariosStaff(staffId, horarios);
}

async function guardarPerfil(
  staffId: string,
  _prev: string | null,
  formData: FormData,
): Promise<string | null>
{
  "use server";

  try
  {
    await actualizarPerfilStaff(staffId, formData.get("descripcion"), formData.getAll("servicios"));
  }
  catch (error)
  {
    return error instanceof Error ? error.message : "No pudimos guardar el perfil. Probá de nuevo.";
  }

  return null;
}

async function guardarFoto(staffId: string, fotoUrl: string | null): Promise<void>
{
  "use server";

  await actualizarFotoStaff(staffId, fotoUrl);
}

export default async function StaffPage()
{
  const { data: dashboard } = await getDashboardData();
  const servicios = (dashboard.servicios as ServicioRow[]).map((s) => ({ id: s.id, nombre: s.nombre }));
  const asociaciones = (dashboard as { asociaciones?: AsociacionRow[] }).asociaciones ?? [];

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {(dashboard.staff as StaffRow[]).map((member) => (
          <div key={member.id} className="ui-card p-5 sm:p-6">
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
              </div>
              <ActionForm
                action={alternarStaff.bind(null, member.id, member.activo === false)}
                successMessage={member.activo === false ? "Profesional activado." : "Profesional desactivado."}
              >
                <SubmitButton className="ui-btn ui-btn-outline ui-btn-sm">
                  {member.activo === false ? "Activar" : "Desactivar"}
                </SubmitButton>
              </ActionForm>
              <StaffDeleteForm action={quitarStaff.bind(null, member.id)} />
            </div>
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <h4 className="text-sm font-semibold text-ink">Perfil</h4>
              <FotoStaffUploader
                staffId={member.id}
                nombre={member.nombre}
                fotoUrl={member.foto_url ?? null}
                action={guardarFoto.bind(null, member.id)}
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
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-ink">Horarios por día</h4>
              <p className="text-xs text-muted-foreground">
                Abrí cada día con el interruptor y elegí la hora con el reloj.
                Podés agregar un segundo turno si corta al mediodía.
              </p>
              <EditorHorariosSemanales
                inicial={member.horarios}
                action={guardarHorarios.bind(null, member.id)}
                submitLabel="Guardar horarios"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
