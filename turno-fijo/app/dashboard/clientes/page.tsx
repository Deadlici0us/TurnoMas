import Link from "next/link";

interface Cliente
{
  readonly id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly ausencias: number;
  readonly enListaNegra: boolean;
  readonly totalTurnos: number;
  readonly ultimoTurno: string;
}

const CLIENTES_DEMO: readonly Cliente[] = [
  {
    id: "1",
    nombre: "Juan Pérez",
    whatsapp: "+549110000001",
    email: "juan@email.com",
    ausencias: 0,
    enListaNegra: false,
    totalTurnos: 8,
    ultimoTurno: "Corte clásico · Ayer",
  },
  {
    id: "2",
    nombre: "María Gómez",
    whatsapp: "+549110000002",
    email: "maria@email.com",
    ausencias: 1,
    enListaNegra: false,
    totalTurnos: 5,
    ultimoTurno: "Barba + corte · Pendiente",
  },
  {
    id: "3",
    nombre: "Falta Siempre",
    whatsapp: "+549110000003",
    email: "falta@email.com",
    ausencias: 2,
    enListaNegra: true,
    totalTurnos: 3,
    ultimoTurno: "Sin turnos recientes",
  },
];

export default function ClientesPage()
{
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Clientes</h1>
              <p className="text-sm text-slate-600">CRM local con historial de turnos</p>
            </div>
            <button className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Nuevo cliente
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Contacto</th>
                  <th className="pb-3 font-semibold">Turnos</th>
                  <th className="pb-3 font-semibold">Ausencias</th>
                  <th className="pb-3 font-semibold">Último turno</th>
                  <th className="pb-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CLIENTES_DEMO.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{c.nombre}</td>
                    <td className="py-3 text-slate-600">
                      <div>{c.email}</div>
                      <div className="text-xs text-slate-500">{c.whatsapp}</div>
                    </td>
                    <td className="py-3 text-slate-600">{c.totalTurnos}</td>
                    <td className="py-3">
                      <span className={c.ausencias > 1 ? "text-red-600 font-semibold" : "text-slate-600"}>
                        {c.ausencias}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{c.ultimoTurno}</td>
                    <td className="py-3">
                      {c.enListaNegra ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">
                          Lista negra
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                          Activo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 mt-6">Datos de demostración de Barbería Diego.</p>
        </div>
      </div>
    </div>
  );
}
