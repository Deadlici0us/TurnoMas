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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Checkout</h1>
          <p className="text-slate-400 mt-1 text-sm">Seña y confirmación de reservas vía MercadoPago.</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 border border-white/15 rounded-xl text-slate-300 hover:bg-white/10"
        >
          Volver
        </Link>
      </div>

      {(dashboard.servicios as ServicioRow[]).map((servicio) => (
        <div key={servicio.id} className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold">
              {servicio.nombre.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-100">{servicio.nombre}</h3>
              <p className="text-sm text-slate-400">
                {`Duración: ${servicio.duracion_min} min · Precio: $ ${servicio.precio_base.toLocaleString("es-AR")}`}
              </p>
              <p className="text-sm text-slate-400">
                {servicio.sena_requerida ? `Seña del ${servicio.sena_porcentaje}%` : "Sin seña requerida"}
                {servicio.precio_promocional !== null ? ` · Promo: $ ${servicio.precio_promocional.toLocaleString("es-AR")}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
