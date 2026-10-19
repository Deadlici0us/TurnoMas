import type { ReactNode } from "react";

export interface PanelProps
{
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
}

/**
 * Tarjeta blanca con encabezado opcional.
 *
 * @param props Título, descripción, acciones y contenido.
 * @return Panel con borde y sombra del sistema visual.
 */
export default function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: PanelProps)
{
  const tieneEncabezado = title !== undefined || description !== undefined || actions !== undefined;

  return (
    <section className={`ui-card ${className}`}>
      {tieneEncabezado ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line
          px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title !== undefined ? <h2 className="ui-section-title">{title}</h2> : null}
            {description !== undefined ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={bodyClassName.length > 0 ? bodyClassName : "p-5 sm:p-6"}>{children}</div>
    </section>
  );
}
