"use client";

import { useMemo, useState } from "react";

import { marcarResenaResuelta } from "@/app/dashboard/resenas/actions";
import { useToast } from "@/components/ui/use-toast";
import { formatearFechaCorta } from "@/lib/format/fecha";
import { normalizarWhatsappParaLink } from "@/lib/notifications/whatsapp";

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

  return Number.isNaN(fecha.getTime()) ? "" : formatearFechaCorta(fecha);
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
  const [pendiente, setPendiente] = useState(false);
  const { showToast } = useToast();
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

  async function alternarResuelto(id: string): Promise<void>
  {
    if (pendiente)
    {
      return;
    }

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

    setPendiente(true);

    try
    {
      const resultado = await marcarResenaResuelta(id, nuevo);

      if (resultado !== undefined && !resultado.ok)
      {
        setResueltos((prev) =>
        {
          const copia = new Set(prev);

          if (nuevo)
          {
            copia.delete(id);
          }
          else
          {
            copia.add(id);
          }

          return copia;
        });
        showToast({ tone: "error", title: "No se pudo completar", message: resultado.error });

        return;
      }

      showToast({
        tone: "success",
        title: "Reseña actualizada",
        message: nuevo ? "Marcada como resuelta." : "Volvió a pendiente.",
      });
    }
    catch
    {
      showToast({ tone: "error", title: "No se pudo actualizar", message: "Probá de nuevo." });
    }
    finally
    {
      setPendiente(false);
    }
  }

  function linkWhatsapp(item: ResenaItem): string | null
  {
    const telefono = normalizarWhatsappParaLink(item.whatsapp);

    if (telefono === null)
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
            className={`ui-tab ${filtro === clave ? "ui-tab-active" : ""}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="ui-card p-8 text-center text-sm text-muted-foreground">
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
              <li key={item.id} className="ui-card p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg leading-none ${mala ? "text-danger" : "text-warning"}`}>
                      {estrellas(item.estrellas)}
                    </p>
                    <p className="mt-2 font-semibold text-ink">{item.cliente}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.servicio} · {fechaCorta(item.fecha)}
                    </p>
                    {item.comentario !== null && item.comentario.length > 0 ? (
                      <p className="mt-2 text-sm text-ink">{item.comentario}</p>
                    ) : null}
                  </div>
                  <span className={`ui-badge shrink-0 ${resuelto ? "ui-badge-success" : "ui-badge-warning"}`}>
                    {resuelto ? "Resuelto" : "Pendiente"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {wa !== null && mala ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                        hover:bg-success-soft"
                    >
                      Contactar por WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { void alternarResuelto(item.id); }}
                    disabled={pendiente}
                    className="ui-btn ui-btn-outline ui-btn-sm"
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
