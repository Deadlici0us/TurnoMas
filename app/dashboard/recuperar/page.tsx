import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";
import { readEnv } from "@/lib/env/env";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import ListaRecuperar from "@/components/lista-recuperar";

export default async function RecuperarPage()
{
  const { data: dashboard } = await getDashboardData();

  if (dashboard.negocio?.remarketing_activo === false)
  {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-100">Recuperación desactivada.</h2>
        <p className="mt-2 text-sm text-slate-400">
          Activá la recuperación de clientes en Configuración para ver esta lista.
        </p>
        <Link
          href="/dashboard/config"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold
            text-slate-950 hover:bg-slate-200"
        >
          Ir a Configuración
        </Link>
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
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-100">No hay nadie para recuperar.</h2>
        <p className="mt-2 text-sm text-slate-400">
          La lista se arma sola cuando un cliente se atrasa según el ritmo de cada servicio.
        </p>
      </div>
    );
  }

  return <ListaRecuperar items={candidatos} portalUrl={portalUrl} />;
}