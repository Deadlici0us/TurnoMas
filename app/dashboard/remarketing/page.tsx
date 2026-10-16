import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";
import { readEnv } from "@/lib/env/env";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import ListaRemarketing from "@/components/lista-remarketing";

export default async function RemarketingPage()
{
  const { data: dashboard } = await getDashboardData();

  const encabezado = (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Remarketing</h1>
      <p className="text-slate-400 mt-1 text-sm">
        Acá ves a quién ya le toca volver a hacerse el servicio. Se calcula solo, según cuánto dura el efecto de cada uno.
      </p>
    </div>
  );

  if (dashboard.negocio?.remarketing_activo === false)
  {
    return (
      <div className="space-y-4">
        {encabezado}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-100">Remarketing desactivado.</h2>
          <p className="mt-2 text-sm text-slate-400">
            Activá el remarketing en Configuración para ver esta lista.
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

  const candidatos = candidatosDesdeDashboard(dashboard);

  const negocio = dashboard.negocio as {
    readonly pais?: unknown;
    readonly slug?: unknown;
  };
  const base = readEnv("NEXT_PUBLIC_APP_URL")
    ?? (readEnv("VERCEL_URL") !== null ? `https://${readEnv("VERCEL_URL") as string}` : null);
  const portalUrl = base !== null && typeof negocio.pais === "string" && typeof negocio.slug === "string"
    ? `${base}/${negocio.pais}/${negocio.slug}`
    : null;

  if (candidatos.length === 0)
  {
    return (
      <div className="space-y-4">
        {encabezado}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-100">No hay nadie para hacer remarketing.</h2>
          <p className="mt-2 text-sm text-slate-400">
            La lista se arma sola cuando a un cliente ya le toca repetir su servicio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {encabezado}
      <ListaRemarketing items={candidatos} portalUrl={portalUrl} />
    </div>
  );
}
