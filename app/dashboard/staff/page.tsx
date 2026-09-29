import { agregarStaff, cambiarEstadoStaff } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
  readonly activo?: boolean | null;
}

async function crearStaff(formData: FormData): Promise<void>
{
  "use server";

  await agregarStaff(String(formData.get("nombre") ?? ""));
}

async function alternarStaff(staffId: string, activo: boolean): Promise<void>
{
  "use server";

  await cambiarEstadoStaff(staffId, activo);
}

export default async function StaffPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
        <p className="text-slate-600 mt-1 text-sm">Profesionales del negocio y sus horarios.</p>
      </div>
      <form action={crearStaff} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="nombre"
          required
          minLength={2}
          maxLength={80}
          placeholder="Nombre del profesional"
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {(dashboard.staff as StaffRow[]).map((member) => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                {member.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{member.nombre}</h3>
                <p className="text-sm text-slate-500">
                  {member.activo === false ? "Inactivo" : "Activo"}
                </p>
              </div>
            </div>
            <form action={alternarStaff.bind(null, member.id, member.activo === false)} className="mt-4">
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                  text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {member.activo === false ? "Activar" : "Desactivar"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
