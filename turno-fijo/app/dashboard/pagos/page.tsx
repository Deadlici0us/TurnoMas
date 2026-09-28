import Link from "next/link";

interface Reserva
{
  readonly id: string;
  readonly cliente: string;
  readonly servicio: string;
  readonly montoTotal: number;
  readonly senaMonto: number | null;
  readonly estado: "pagado" | "pendiente" | "completado" | "reembolsado";
  readonly fecha: string;
}

const RESERVAS_DEMO: readonly Reserva[] = [
  { id: "1", cliente: "Juan Pérez", servicio: "Corte clásico", montoTotal: 1500000, senaMonto: 750000, estado: "pagado", fecha: "Hoy" },
  { id: "2", cliente: "María Gómez", servicio: "Barba + corte", montoTotal: 2000000, senaMonto: 1000000, estado: "pendiente", fecha: "Mañana" },
  { id: "3", cliente: "Juan Pérez", servicio: "Perfilado de barba", montoTotal: 800000, senaMonto: null, estado: "completado", fecha: "Ayer" },
];

function formatARS(cents: number | null): string
{
  if (cents === null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cents / 100);
}

export default function PagosPage()
{
  const totalPendiente = RESERVAS_DEMO.filter(r => r.estado === "pendiente").reduce((a, r) => a + (r.montoTotal - (r.senaMonto ?? 0)), 0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Pagos</h1>
              <p className="text-sm text-slate-600">Seguimiento financiero de señas</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Pendiente cobrar</div>
              <div className="text-2xl font-bold text-blue-600">{formatARS(totalPendiente)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Servicio</th>
                  <th className="pb-3 font-semibold">Total</th>
                  <th className="pb-3 font-semibold">Seña</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RESERVAS_DEMO.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{r.cliente}</td>
                    <td className="py-3 text-slate-600">{r.servicio}</td>
                    <td className="py-3 text-slate-600">{formatARS(r.montoTotal)}</td>
                    <td className="py-3 text-slate-600">{formatARS(r.senaMonto)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        r.estado === "pagado" ? "bg-green-100 text-green-800" :
                        r.estado === "pendiente" ? "bg-amber-100 text-amber-800" :
                        r.estado === "completado" ? "bg-slate-100 text-slate-600" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{r.fecha}</td>
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
