import Link from "next/link";

import { getDashboardData } from "@/lib/dashboard/queries";
import { readEnv } from "@/lib/env/env";
import { candidatosDesdeDashboard } from "@/lib/remarketing/dashboard";
import PageHeader from "@/components/ui/page-header";
import ListaRemarketing from "@/components/lista-remarketing";

export default async function RemarketingPage()
{
  const { data: dashboard } = await getDashboardData();

  const encabezado = (
    <PageHeader
      title="Remarketing"
      subtitle="Acá ves a quién ya le toca volver a hacerse el servicio. Se calcula solo, según cuánto dura el efecto de cada uno."
    />
  );

  if (dashboard.negocio?.remarketing_activo === false)
  {
    return (
      <div className="space-y-4">
        {encabezado}
        <div className="ui-card p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">Remarketing desactivado.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Activá el remarketing en Configuración para ver esta lista.
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
        <div className="ui-card p-8 text-center">
          <h2 className="text-lg font-semibold text-ink">No hay nadie para hacer remarketing.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
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
