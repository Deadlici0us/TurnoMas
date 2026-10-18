"use client";

import { useMemo, useState, useTransition } from "react";

import { marcarResenaResuelta } from "@/app/dashboard/resenas/actions";

export interface ResenaItem
{
  readonly id: string;
  readonly estrellas: number;
  readonly comentario: string | null;
  readonly resuelto: boolean;
  readonly fecha: string;
  readonly cliente: string;
  readonly whatsapp: string;
  readonly servicio: string;
}

type Filtro = "todas" | "buenas" | "malas" | "pendientes";

const FILTROS: readonly { readonly clave: Filtro; readonly etiqueta: string }[] = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "buenas", etiqueta: "Buenas (4-5★)" },
  { clave: "malas", etiqueta: "Malas (1-3★)" },
  { clave: "pendientes", etiqueta: "Pendientes" },
];

function estrellas(n: number): string
{
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function fechaCorta(iso: string): string
{
  const fecha = new Date(iso);

  return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-AR");
}

/** Lista de reseñas capturadas con filtros y acciones de recuperación. */
export default function ListaResenas({
  items,
  negocioNombre,
}: {
  readonly items: readonly ResenaItem[];
  readonly negocioNombre: string;
})
{
  const [, startTransition] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [resueltos, setResueltos] = useState<ReadonlySet<string>>(
    () => new Set(items.filter((i) => i.resuelto).map((i) => i.id)),
  );

  const visibles = useMemo(() =>
  {
    if (filtro === "buenas")
    {
      return items.filter((i) => i.estrellas >= 4);
    }

    if (filtro === "malas")
    {
      return items.filter((i) => i.estrellas <= 3);
    }

    if (filtro === "pendientes")
    {
      return items.filter((i) => !resueltos.has(i.id));
    }

    return items;
  }, [items, filtro, resueltos]);

  function alternarResuelto(id: string): void
  {
    const nuevo = !resueltos.has(id);

    setResueltos((prev) =>
    {
      const copia = new Set(prev);

      if (nuevo)
      {
        copia.add(id);
      }
      else
      {
        copia.delete(id);
      }

      return copia;
    });

    startTransition(async () =>
    {
      await marcarResenaResuelta(id, nuevo);
    });
  }

  function linkWhatsapp(item: ResenaItem): string | null
  {
    const telefono = item.whatsapp.replace(/\D/g, "");

    if (telefono.length === 0)
    {
      return null;
    }

    const texto = encodeURIComponent(
      `Hola ${item.cliente}, gracias por tu opinión sobre ${item.servicio} en ${negocioNombre}. `
      + "Queremos mejorar tu experiencia, ¿podemos ayudarte?",
    );

    return `https://wa.me/${telefono}?text=${texto}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ clave, etiqueta }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setFiltro(clave)}
            className={filtro === clave
              ? "inline-flex h-9 items-center rounded-lg border border-brand-500/50 bg-brand-500/15 px-3 text-xs font-semibold text-brand-200"
              : "inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5"}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
          No hay reseñas para este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((item) =>
          {
            const resuelto = resueltos.has(item.id);
            const wa = linkWhatsapp(item);
            const mala = item.estrellas <= 3;

            return (
              <li key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg leading-none ${mala ? "text-rose-400" : "text-amber-400"}`}>
                      {estrellas(item.estrellas)}
                    </p>
                    <p className="mt-2 font-semibold text-slate-100">{item.cliente}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.servicio} · {fechaCorta(item.fecha)}
                    </p>
                    {item.comentario !== null && item.comentario.length > 0 ? (
                      <p className="mt-2 text-sm text-slate-300">{item.comentario}</p>
                    ) : null}
                  </div>
                  <span className={resuelto
                    ? "shrink-0 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300"
                    : "shrink-0 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300"}>
                    {resuelto ? "Resuelto" : "Pendiente"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {wa !== null && mala ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-green-500/40 px-3 text-xs font-semibold
                        text-green-300 hover:bg-green-500/20"
                    >
                      Contactar por WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => alternarResuelto(item.id)}
                    className="inline-flex h-9 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold
                      text-slate-300 hover:bg-white/10"
                  >
                    {resuelto ? "Deshacer" : "Marcar resuelto"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
