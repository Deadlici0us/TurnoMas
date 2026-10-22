"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps
{
  readonly error: Error & { readonly digest?: string };
  readonly retry: () => void;
}

/** Error boundary global de la aplicación. */
export default function ErrorPage({ error, retry }: ErrorPageProps)
{
  useEffect(() =>
  {
    console.error("[turnomas:error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-navy">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        No pudimos completar la operación. Tus datos están a salvo.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={retry} className="ui-btn ui-btn-primary">
          Reintentar
        </button>
        <Link href="/dashboard" className="ui-btn ui-btn-outline">
          Ir al panel
        </Link>
      </div>
    </main>
  );
}
