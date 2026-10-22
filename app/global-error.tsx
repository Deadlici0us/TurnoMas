"use client";

import { useEffect } from "react";

interface GlobalErrorProps
{
  readonly error: Error & { readonly digest?: string };
  readonly retry: () => void;
}

/** Error boundary del layout raíz. */
export default function GlobalError({ error, retry }: GlobalErrorProps)
{
  useEffect(() =>
  {
    console.error("[turnomas:global-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-heading text-2xl font-bold">Algo salió mal</h1>
          <p className="text-sm">No pudimos cargar TurnoMas. Probá de nuevo.</p>
          <button type="button" onClick={retry} className="ui-btn ui-btn-primary">
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
