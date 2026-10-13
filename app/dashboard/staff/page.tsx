import { actualizarHorariosStaff, agregarStaff, cambiarEstadoStaff, eliminarStaff } from "./actions";
import StaffDeleteForm from "@/components/staff-delete-form";
import { getDashboardData } from "@/lib/dashboard/queries";
import { DAY_ORDER, dayLabel, type DayKey } from "@/lib/staff/schedule";

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
  readonly activo?: boolean | null;
  readonly horarios?: unknown;
}

function franjasDeDia(horarios: unknown, day: DayKey): string
{
  if (typeof horarios !== "object" || horarios === null || Array.isArray(horarios))
  {
    return "";
  }

  const raw = (horarios as Record<string, unknown>)[day];

  if (typeof raw === "string")
  {
    return raw;
  }

  if (Array.isArray(raw))
  {
    return raw.filter((item): item is string => typeof item === "string").join(", ");
  }

  return "";
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

export default async function StaffPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Equipo</h1>
        <p className="text-slate-400 mt-1 text-sm">Profesionales del negocio y sus horarios.</p>
      </div>
      <form action={crearStaff} className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          placeholder="Nombre del profesional"
          className="flex-1 px-4 py-2 bg-white/5 border border-white/15 text-slate-100 rounded-lg outline-none placeholder:text-slate-500
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          Agregar profesional
        </button>
      </form>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {(dashboard.staff as StaffRow[]).map((member) => (
          <div key={member.id} className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold">
                {member.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-100">{member.nombre}</h3>
                <p className="text-sm text-slate-400">
                  {member.activo === false ? "Inactivo" : "Activo"}
                </p>
              </div>
              <form action={alternarStaff.bind(null, member.id, member.activo === false)}>
                <button
                  type="submit"
                  className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                    text-slate-400 hover:bg-white/10 transition-colors"
                >
                  {member.activo === false ? "Activar" : "Desactivar"}
                </button>
              </form>
              <StaffDeleteForm action={quitarStaff.bind(null, member.id)} />
            </div>
            <form action={guardarHorarios.bind(null, member.id)} className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-slate-100">Horarios por día</h4>
              <p className="text-xs text-slate-400">
                Una franja de corrido (09:00-19:00) o varias con descanso (09:00-13:00, 15:00-20:00).
                Vacío = cerrado.
              </p>
              {DAY_ORDER.map((day) => (
                <label key={day} className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="w-20 shrink-0 font-medium">{dayLabel(day)}</span>
                  <input
                    type="text"
                    name={day}
                    defaultValue={franjasDeDia(member.horarios, day)}
                    placeholder="Cerrado"
                    className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/15 text-slate-100 rounded-lg outline-none placeholder:text-slate-500
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              ))}
              <button
                type="submit"
                className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg
                  hover:bg-blue-700 transition-colors"
              >
                Guardar horarios
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
