"use client";

import { useMemo, useState } from "react";

import { deshacerRemarketingManual, marcarRemarketingManual } from "@/app/dashboard/remarketing/actions";
import BuscadorEnVivo from "@/components/ui/buscador-en-vivo";
import { useToast } from "@/components/ui/use-toast";
import { filtrarEnVivo } from "@/lib/busqueda/filtrar-en-vivo";
import { linkRemarketingWhatsapp } from "@/lib/remarketing/link";

export interface ListaItemProps
{
  readonly turnoId: string;
  readonly clienteNombre: string;
  readonly whatsapp: string;
  readonly servicioNombre: string;
  readonly diasObjetivo: number;
  readonly atrasoDias: number;
}

/**
 * Lista de clientes para hacer remarketing con marca manual y deshacer.
 *
 * @return Filas con acciones de WhatsApp/Omitir y aviso temporal.
 */
export default function ListaRemarketing({
  items,
  portalUrl,
  negocioNombre,
  msgRemarketingSubject,
  msgRemarketingCuerpo,
}: {
  readonly items: readonly ListaItemProps[];
  readonly portalUrl: string | null;
  readonly negocioNombre: string;
  readonly msgRemarketingSubject: string | null;
  readonly msgRemarketingCuerpo: string | null;
})
{
  const [pendiente, setPendiente] = useState(false);
  const { showToast } = useToast();
  const [visibles, setVisibles] = useState<readonly string[]>(items.map((item) => item.turnoId));
  const [query, setQuery] = useState("");

  function ocultar(turnoId: string): void
  {
    setVisibles((prev) => prev.filter((id) => id !== turnoId));
  }

  function mostrar(turnoId: string): void
  {
    setVisibles((prev) => (prev.includes(turnoId) ? prev : [...prev, turnoId]));
  }

  async function marcar(turnoId: string): Promise<void>
  {
    if (pendiente)
    {
      return;
    }

    setPendiente(true);
    ocultar(turnoId);

    try
    {
      const resultado = await marcarRemarketingManual(turnoId);

      if (resultado !== undefined && !resultado.ok)
      {
        mostrar(turnoId);
        showToast({ tone: "error", title: "No se pudo completar", message: resultado.error });

        return;
      }

      showToast({
        tone: "success",
        title: "Contacto registrado",
        message: "Marcado como contactado.",
        duration: 6000,
        action: {
          label: "Deshacer",
          onClick: () =>
          {
            mostrar(turnoId);
            void deshacer(turnoId);
          },
        },
      });
    }
    catch
    {
      mostrar(turnoId);
      showToast({ tone: "error", title: "No se pudo marcar", message: "Probá de nuevo." });
    }
    finally
    {
      setPendiente(false);
    }
  }

  async function deshacer(turnoId: string): Promise<void>
  {
    try
    {
      const resultado = await deshacerRemarketingManual(turnoId);

      if (resultado !== undefined && !resultado.ok)
      {
        showToast({ tone: "error", title: "No se pudo completar", message: resultado.error });

        return;
      }
      showToast({ tone: "success", title: "Listo", message: "Se deshizo el cambio." });
    }
    catch
    {
      ocultar(turnoId);
      showToast({ tone: "error", title: "No se pudo deshacer", message: "Probá de nuevo." });
    }
  }

  function linkWhatsapp(item: ListaItemProps): string | null
  {
    return linkRemarketingWhatsapp({
      whatsapp: item.whatsapp,
      clienteNombre: item.clienteNombre,
      portalUrl,
      negocioNombre,
      msg_remarketing_subject: msgRemarketingSubject,
      msg_remarketing_cuerpo: msgRemarketingCuerpo,
      servicioNombre: item.servicioNombre,
    });
  }

  const aMostrar = useMemo(
    () => filtrarEnVivo(
      items.filter((item) => visibles.includes(item.turnoId)),
      query,
      (item) => [item.clienteNombre, item.whatsapp, item.servicioNombre],
    ),
    [items, visibles, query],
  );

  return (
    <div className="space-y-4">
      <BuscadorEnVivo
        value={query}
        onChange={setQuery}
        placeholder="Buscar por cliente, WhatsApp o servicio"
      />
      <ul className="space-y-3">
        {aMostrar.map((item) =>
        {
          const wa = linkWhatsapp(item);

          return (
            <li
              key={item.turnoId}
              className="ui-card p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{item.clienteNombre}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Última visita: {item.servicioNombre}
                    {item.atrasoDias === 0 ? " · le toca hoy" : ` · hace ${item.atrasoDias + item.diasObjetivo} días`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.atrasoDias === 0
                      ? `Le correspondía a los ${item.diasObjetivo} días`
                      : `Le correspondía a los ${item.diasObjetivo} días · atrasado ${item.atrasoDias}`}
                  </p>
                </div>
                <span className={`ui-badge shrink-0 ${item.atrasoDias === 0
                  ? "ui-badge-info"
                  : "ui-badge-warning"}`}>
                  {item.atrasoDias === 0 ? "Hoy" : `Atrasado ${item.atrasoDias} días`}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {wa !== null ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { void marcar(item.turnoId); }}
                    className="ui-btn ui-btn-outline ui-btn-sm border-success/40 text-[#0c6b45]
                      hover:bg-success-soft"
                  >
                    Recordarle por WhatsApp
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => { void marcar(item.turnoId); }}
                  disabled={pendiente}
                  className="ui-btn ui-btn-outline ui-btn-sm"
                >
                  Omitir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {aMostrar.length === 0 ? (
        <p className="ui-card p-8 text-center text-sm text-muted-foreground" role="status">
          {query.trim().length > 0
            ? "Ningún cliente coincide con la búsqueda."
            : "No hay nadie más para hacer remarketing. Buen trabajo."}
        </p>
      ) : null}
    </div>
  );
}