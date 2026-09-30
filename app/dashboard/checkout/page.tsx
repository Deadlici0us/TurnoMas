import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";

interface ServicioRow
{
  readonly id: string;
  readonly nombre: string;
  readonly duracion_min: number;
  readonly precio_base: number;
  readonly precio_promocional: number | null;
  readonly sena_requerida: boolean;
  readonly sena_porcentaje: number;
}

export default async function CheckoutPage()
{
  const { data: dashboard } = await getDashboardData();

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
            <p className="text-slate-600 mt-2">Seña y confirmación de reservas vía MercadoPago.</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Volver
          </Link>
        </div>

        {(dashboard.servicios as ServicioRow[]).map((servicio) => (
          <div key={servicio.id} className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                {servicio.nombre.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{servicio.nombre}</h3>
                <p className="text-sm text-slate-500">
                  {`Duración: ${servicio.duracion_min} min · Precio: $ ${servicio.precio_base.toLocaleString("es-AR")}`}
                </p>
                <p className="text-sm text-slate-500">
                  {servicio.sena_requerida ? `Seña del ${servicio.sena_porcentaje}%` : "Sin seña requerida"}
                  {servicio.precio_promocional !== null ? ` · Promo: $ ${servicio.precio_promocional.toLocaleString("es-AR")}` : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
