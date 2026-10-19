import Link from "next/link";

import PageHeader from "@/components/ui/page-header";
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
      <PageHeader
        title="Checkout"
        subtitle="Seña y confirmación de reservas vía MercadoPago."
        actions={<Link href="/dashboard" className="ui-btn ui-btn-outline">Volver</Link>}
      />

      {(dashboard.servicios as ServicioRow[]).map((servicio) => (
        <div key={servicio.id} className="ui-card mb-4 p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-warning-soft
              font-heading font-bold text-[#7a5200]">
              {servicio.nombre.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-ink">{servicio.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                {`Duración: ${servicio.duracion_min} min · Precio: $ ${servicio.precio_base.toLocaleString("es-AR")}`}
              </p>
              <p className="text-sm text-muted-foreground">
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
