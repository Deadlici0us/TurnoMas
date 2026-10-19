import { claseBadgePara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";

export interface StatusBadgeProps
{
  readonly estado: string;
  readonly className?: string;
}

/**
 * Badge de estado de turno con colores claros unificados.
 *
 * @param props Estado libre y clases extra.
 * @return Etiqueta redondeada.
 */
export default function StatusBadge({ estado, className = "" }: StatusBadgeProps)
{
  return (
    <span className={`ui-badge ${claseBadgePara(estado)} ${className}`}>
      {etiquetaEstadoPara(estado)}
    </span>
  );
}
