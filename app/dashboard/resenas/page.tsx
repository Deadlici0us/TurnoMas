import Link from "next/link";

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
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Reseñas</h1>
      <p className="text-slate-400 mt-1 text-sm">
        Acá ves lo que dejan tus clientes cuando eligen contarte en privado. Podés contactarlos y marcarlas como resueltas.
      </p>
    </div>
  );

  if (negocio.resena_activa === false)
  {
    return (
      <div className="space-y-4">
        {encabezado}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-100">Reseñas desactivadas.</h2>
          <p className="mt-2 text-sm text-slate-400">
            Activá las reseñas en Configuración para pedirlas y verlas acá.
          </p>
          <Link
            href="/dashboard/config"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold
              text-slate-950 hover:bg-slate-200"
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
