import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps
{
  readonly Icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}

/**
 * Estado vacío consistente para paneles y listas.
 *
 * @param props Icono, título, descripción y acción opcional.
 * @return Bloque centrado sobre fondo suave.
 */
export default function EmptyState({ Icon, title, description, action }: EmptyStateProps)
{
  return (
    <div className="ui-empty">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-heading text-base font-bold text-ink">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
