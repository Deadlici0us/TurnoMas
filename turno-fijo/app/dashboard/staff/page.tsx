import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";

interface StaffRow
{
  readonly id: string;
  readonly nombre: string;
  readonly activo?: boolean | null;
}

export default async function StaffPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Equipo</h1>
            <p className="text-slate-600 mt-2">Profesionales del negocio y sus horarios.</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Volver
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(dashboard.staff as StaffRow[]).map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm p-6">
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
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
