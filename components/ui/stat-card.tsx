import type { LucideIcon } from "lucide-react";

export type StatTone = "teal" | "amber" | "green" | "navy" | "coral";

const TONOS: Record<StatTone, string> = {
  teal: "bg-info-soft text-primary",
  amber: "bg-warning-soft text-[#b07d00]",
  green: "bg-success-soft text-[#0c6b45]",
  navy: "bg-[#eef2f8] text-navy",
  coral: "bg-danger-soft text-danger",
};

export interface StatCardProps
{
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly Icon: LucideIcon;
  readonly tone?: StatTone;
}

/**
 * Indicador numérico del dashboard.
 *
 * @param props Etiqueta, valor, detalle, icono y tono.
 * @return Tarjeta blanca con icono pastel.
 */
export default function StatCard({ label, value, detail, Icon, tone = "teal" }: StatCardProps)
{
  return (
    <div className="ui-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`inline-flex size-9 items-center justify-center rounded-full ${TONOS[tone]}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-3 text-[28px] leading-8 font-bold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {detail !== undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}
