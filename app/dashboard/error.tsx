"use client";

import { useEffect } from "react";
import Link from "next/link";

interface DashboardErrorProps
{
  readonly error: Error & { readonly digest?: string };
  readonly retry: () => void;
}

/** Error boundary del dashboard: mantiene la navegación y permite reintentar. */
export default function DashboardError({ error, retry }: DashboardErrorProps)
{
  useEffect(() =>
  {
    console.error("[turnomas:dashboard-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="ui-card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <h1 className="font-heading text-xl font-bold text-navy">No pudimos cargar esta sección</h1>
      <p className="text-sm text-muted-foreground">
        Reintentá o volvé a la agenda. Si el problema sigue, escribinos.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={retry} className="ui-btn ui-btn-primary">
          Reintentar
        </button>
        <Link href="/dashboard/agenda" className="ui-btn ui-btn-outline">
          Ir a la agenda
        </Link>
      </div>
    </div>
  );
}
