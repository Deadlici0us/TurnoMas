import type { ReactNode } from "react";

export interface PageHeaderProps
{
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
  readonly actionsBelow?: ReactNode;
}

/**
 * Encabezado estándar de página del panel.
 *
 * @param props Título, subtítulo, acciones alineadas a la derecha y acciones debajo.
 * @return Bloque de encabezado responsive.
 */
export default function PageHeader({ title, subtitle, actions, actionsBelow }: PageHeaderProps)
{
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="ui-page-title">{title}</h1>
        {subtitle !== undefined && subtitle.length > 0 ? (
          <p className="ui-page-subtitle">{subtitle}</p>
        ) : null}
        {actionsBelow !== undefined ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">{actionsBelow}</div>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
