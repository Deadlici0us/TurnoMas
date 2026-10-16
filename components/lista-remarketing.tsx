"use client";

import { useEffect, useState, useTransition } from "react";

import { deshacerRemarketingManual, marcarRemarketingManual } from "@/app/dashboard/remarketing/actions";

export interface ListaItemProps
{
  readonly turnoId: string;
  readonly clienteNombre: string;
  readonly whatsapp: string;
  readonly servicioNombre: string;
  readonly diasObjetivo: number;
  readonly atrasoDias: number;
}

interface Toast
{
  readonly mensaje: string;
  readonly onDeshacer: () => void;
}

/**
 * Lista de clientes para hacer remarketing con marca manual y deshacer.
 *
 * @return Filas con acciones de WhatsApp/Omitir y aviso temporal.
 */
export default function ListaRemarketing({
  items,
  portalUrl,
}: {
  readonly items: readonly ListaItemProps[];
  readonly portalUrl: string | null;
})
{
  const [, startMarcar] = useTransition();
  const [, startDeshacer] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const [visibles, setVisibles] = useState<readonly string[]>(items.map((item) => item.turnoId));

  useEffect(() =>
  {
    if (toast === null)
    {
      return;
    }

    const timer = setTimeout(() => setToast(null), 6000);

    return () => clearTimeout(timer);
  }, [toast]);

  function ocultar(turnoId: string): void
  {
    setVisibles((prev) => prev.filter((id) => id !== turnoId));
  }

  function mostrar(turnoId: string): void
  {
    setVisibles((prev) => (prev.includes(turnoId) ? prev : [...prev, turnoId]));
  }

  function marcar(turnoId: string): void
  {
    ocultar(turnoId);

    startMarcar(async () =>
    {
      await marcarRemarketingManual(turnoId);
      setToast({
        mensaje: "Marcado como contactado.",
        onDeshacer: () =>
        {
          setToast(null);
          mostrar(turnoId);

          startDeshacer(async () =>
          {
            await deshacerRemarketingManual(turnoId);
          });
        },
      });
    });
  }

  function linkWhatsapp(item: ListaItemProps): string | null
  {
    if (portalUrl === null)
    {
      return null;
    }

    const telefono = item.whatsapp.replace(/\D/g, "");
    const texto = encodeURIComponent(
      `¡Hola! Ya pasó el tiempo para volver a hacerte tu ${item.servicioNombre}. ¿Querés que te reserve un turno? ${portalUrl}`,
    );

    return `https://wa.me/${telefono}?text=${texto}`;
  }

  const aMostrar = items.filter((item) => visibles.includes(item.turnoId));

  return (
    <>
      {toast !== null ? (
        <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4" role="status">
          <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-green-500/40
            bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-300 shadow-lg">
            <span>{toast.mensaje}</span>
            <button
              type="button"
              onClick={toast.onDeshacer}
              className="shrink-0 text-xs font-semibold underline hover:text-green-200"
            >
              Deshacer
            </button>
          </div>
        </div>
      ) : null}
      <ul className="space-y-3">
        {aMostrar.map((item) =>
        {
          const wa = linkWhatsapp(item);

          return (
            <li
              key={item.turnoId}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-100">{item.clienteNombre}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    Última visita: {item.servicioNombre}
                    {item.atrasoDias === 0 ? " · le toca hoy" : ` · hace ${item.atrasoDias + item.diasObjetivo} días`}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.atrasoDias === 0
                      ? `Le correspondía a los ${item.diasObjetivo} días`
                      : `Le correspondía a los ${item.diasObjetivo} días · atrasado ${item.atrasoDias}`}
                  </p>
                </div>
                <span className={item.atrasoDias === 0
                  ? "shrink-0 inline-flex rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300"
                  : "shrink-0 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300"}>
                  {item.atrasoDias === 0 ? "Hoy" : `Atrasado ${item.atrasoDias} días`}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {wa !== null ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => marcar(item.turnoId)}
                    className="inline-flex h-9 items-center rounded-lg border border-green-500/40 px-3 text-xs font-semibold
                      text-green-300 hover:bg-green-500/20"
                  >
                    Enviar por WhatsApp
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => marcar(item.turnoId)}
                  className="inline-flex h-9 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold
                    text-slate-300 hover:bg-white/10"
                >
                  Omitir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {aMostrar.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
          No hay nadie más para hacer remarketing. Buen trabajo.
        </p>
      ) : null}
    </>
  );
}