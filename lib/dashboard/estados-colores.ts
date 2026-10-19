/**
 * Colores y leyendas únicas para los estados de turno.
 *
 * Una sola fuente para la agenda (grilla + lista) y pagos: si un color
 * cambia acá, cambia en todos lados y la leyenda lo explica en es-AR.
 */

import type { EstadoTurno } from "./estados";

export interface LeyendaEstado
{
  readonly estado: EstadoTurno;
  readonly titulo: string;
  readonly descripcion: string;
  readonly clase: string;
}

/** Badge compacto (listas y tabla de pagos) sobre fondo claro. */
export const ESTADO_BADGE: Record<EstadoTurno, string> =
{
  pagado: "ui-badge-success",
  confirmado: "ui-badge-info",
  pendiente: "ui-badge-warning",
  completado: "border-[#c9d3e3] bg-[#eef2f8] text-navy",
  cancelado: "ui-badge-neutral line-through",
  ausente: "ui-badge-danger",
};

/** Bloque de la grilla: fondo pastel y borde izquierdo de color. */
export const ESTADO_GRILLA: Record<EstadoTurno, string> =
{
  pendiente: "border border-warning/40 border-l-4 border-l-warning bg-warning-soft text-[#6b4a00]",
  confirmado: "border border-info/30 border-l-4 border-l-info bg-info-soft text-[#0b5f7f]",
  pagado: "border border-success/30 border-l-4 border-l-success bg-success-soft text-[#0c6b45]",
  completado: "border border-[#c9d3e3] border-l-4 border-l-navy bg-[#eef2f8] text-navy",
  ausente: "border border-danger/30 border-l-4 border-l-danger bg-danger-soft text-[#a3122f]",
  cancelado: "border border-line border-l-4 border-l-[#abbccc] bg-[#f4f6f9] text-muted-foreground line-through",
};

/** Etiqueta visible para cada estado (el enum `pagado` es solo la seña). */
export const ETIQUETA_ESTADO: Record<EstadoTurno, string> =
{
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  pagado: "Seña pagada",
  completado: "Completado",
  cancelado: "Cancelado",
  ausente: "Ausente",
};

/** Eventos externos de Google Calendar (no son turnos del negocio). */
export const EXTERNO_LEYENDA =
{
  titulo: "Google",
  descripcion: "Evento de tu Google Calendar (ocupa la agenda, no se cobra)",
  clase: "border border-dashed border-[#abbccc] bg-[#f8faff] text-[#5c6b7a]",
} as const;

/** Leyenda completa en es-AR para agenda y pagos. */
export const LEYENDA_ESTADOS: readonly LeyendaEstado[] =
[
  { estado: "pendiente", titulo: "Pendiente", descripcion: "Con seña, esperando el pago", clase: ESTADO_BADGE.pendiente },
  { estado: "confirmado", titulo: "Confirmado", descripcion: "Sin seña, se paga presencial", clase: ESTADO_BADGE.confirmado },
  { estado: "pagado", titulo: "Seña pagada", descripcion: "Seña cobrada, falta saldo presencial", clase: ESTADO_BADGE.pagado },
  { estado: "completado", titulo: "Completado", descripcion: "Turno ya realizado", clase: ESTADO_BADGE.completado },
  { estado: "ausente", titulo: "Ausente", descripcion: "El cliente no vino", clase: ESTADO_BADGE.ausente },
  { estado: "cancelado", titulo: "Cancelado", descripcion: "Turno cancelado", clase: ESTADO_BADGE.cancelado },
];

/** Etiqueta visible para un estado libre (sin romper si llega un valor raro). */
export function etiquetaEstadoPara(estado: string): string
{
  return (ETIQUETA_ESTADO as Record<string, string>)[estado] ?? estado;
}

/** Clase badge para un estado libre (con fallback a cancelado). */
export function claseBadgePara(estado: string): string
{
  return (ESTADO_BADGE as Record<string, string>)[estado] ?? ESTADO_BADGE.cancelado;
}

/** Clase de grilla para un estado libre (con fallback a cancelado). */
export function claseGrillaPara(estado: string): string
{
  return (ESTADO_GRILLA as Record<string, string>)[estado] ?? ESTADO_GRILLA.cancelado;
}
