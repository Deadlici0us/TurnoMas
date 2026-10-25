import Link from "next/link";

import PageHeader from "@/components/ui/page-header";
import ListaResenas from "@/components/lista-resenas";
import { getDashboardData } from "@/lib/dashboard/queries";
import { listarResenas } from "@/lib/resenas/queries";

export default async function ResenasPage()
{
  const { data: dashboard } = await getDashboardData();
  const negocio = dashboard.negocio as {
    readonly id?: unknown;
    readonly nombre?: unknown;
    readonly resena_activa?: unknown;
  };

  const encabezado = (
    <PageHeader
      title="Reseñas"
      subtitle="Acá ves lo que dejan tus clientes cuando eligen contarte en privado. Podés contactarlos y marcarlas como resueltas."
    />
  );

  if (negocio.resena_activa === false)
  {
    return (
      <div className="space-y-4">
        {encabezado}
        <div className="ui-card p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">Reseñas desactivadas.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Activá las reseñas en Configuración para pedirlas y verlas acá.
          </p>
          <Link
            href="/dashboard/config"
            className="ui-btn ui-btn-primary mt-4"
          >
            Ir a Configuración
          </Link>
        </div>
      </div>
    );
  }

  const negocioId = typeof negocio.id === "string" && negocio.id.length > 0 ? negocio.id : null;
  const items = negocioId === null ? [] : await listarResenas(negocioId);
  const negocioNombre = typeof negocio.nombre === "string" ? negocio.nombre : "tu negocio";

  return (
    <div className="space-y-4">
      {encabezado}
      <ListaResenas items={items} negocioNombre={negocioNombre} />
    </div>
  );
}
