import Link from "next/link";

interface Servicio
{
  readonly id: string;
  readonly nombre: string;
  readonly duracionMin: number;
  readonly bufferLimpiezaMin: number;
  readonly precioBase: number;
  readonly precioPromocional: number | null;
  readonly senaRequerida: boolean;
  readonly senaPorcentaje: number;
  readonly reembolsoAutomatico: boolean;
  readonly remarketing: boolean;
}

const SERVICIOS_DEMO: readonly Servicio[] = [
  {
    id: "1",
    nombre: "Corte clásico",
    duracionMin: 30,
    bufferLimpiezaMin: 15,
    precioBase: 1500000,
    precioPromocional: null,
    senaRequerida: true,
    senaPorcentaje: 50,
    reembolsoAutomatico: true,
    remarketing: true,
  },
  {
    id: "2",
    nombre: "Barba + corte",
    duracionMin: 45,
    bufferLimpiezaMin: 15,
    precioBase: 2000000,
    precioPromocional: 1700000,
    senaRequerida: true,
    senaPorcentaje: 50,
    reembolsoAutomatico: true,
    remarketing: true,
  },
  {
    id: "3",
    nombre: "Perfilado de barba",
    duracionMin: 20,
    bufferLimpiezaMin: 10,
    precioBase: 800000,
    precioPromocional: null,
    senaRequerida: false,
    senaPorcentaje: 0,
    reembolsoAutomatico: false,
    remarketing: false,
  },
];

function formatARS(cents: number): string
{
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cents / 100);
}

export default function ServiciosPage()
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
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Servicios</h1>
              <p className="text-sm text-slate-600">CRUD de servicios con precio base y promocional</p>
            </div>
            <button className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Nuevo servicio
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Servicio</th>
                  <th className="pb-3 font-semibold">Duración</th>
                  <th className="pb-3 font-semibold">Buffer</th>
                  <th className="pb-3 font-semibold">Precios</th>
                  <th className="pb-3 font-semibold">Seña</th>
                  <th className="pb-3 font-semibold">Automatizaciones</th>
                  <th className="pb-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SERVICIOS_DEMO.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{s.nombre}</td>
                    <td className="py-3 text-slate-600">{s.duracionMin} min</td>
                    <td className="py-3 text-slate-600">{s.bufferLimpiezaMin} min</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatARS(s.precioBase)}</span>
                        {s.precioPromocional ? (
                          <>
                            <span className="text-slate-400 line-through text-sm">{formatARS(s.precioPromocional)}</span>
                            <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">Oferta</span>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {s.senaRequerida ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          {s.senaPorcentaje}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin seña</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={s.reembolsoAutomatico ? "text-green-600" : "text-slate-400"}>↩ Reembolso</span>
                        <span className={s.remarketing ? "text-purple-600" : "text-slate-400"}>🔁 Remarketing</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:underline text-sm">Editar</button>
                        <button className="text-red-600 hover:underline text-sm">Eliminar</button>
                      </div>
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
