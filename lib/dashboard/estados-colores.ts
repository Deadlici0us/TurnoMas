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

/** Badge compacto (listas y tabla de pagos). */
export const ESTADO_BADGE: Record<EstadoTurno, string> =
{
  pagado: "bg-green-100 text-green-800 border-green-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  completado: "bg-slate-100 text-slate-600 border-slate-200",
  cancelado: "bg-slate-100 text-slate-500 border-slate-200",
  ausente: "bg-red-100 text-red-800 border-red-200",
};

/** Bloque de la grilla semanal (más saturado para verse sobre la grilla). */
export const ESTADO_GRILLA: Record<EstadoTurno, string> =
{
  pendiente: "bg-amber-200 border-amber-400 text-amber-900",
  confirmado: "bg-blue-200 border-blue-400 text-blue-900",
  pagado: "bg-green-200 border-green-400 text-green-900",
  completado: "bg-slate-200 border-slate-300 text-slate-600",
  ausente: "bg-red-200 border-red-400 text-red-900",
  cancelado: "bg-slate-100 border-slate-200 text-slate-400 line-through",
};

/** Eventos externos de Google Calendar (no son turnos del negocio). */
export const EXTERNO_LEYENDA =
{
  titulo: "Google",
  descripcion: "Evento de tu Google Calendar (ocupa la agenda, no se cobra)",
  clase: "bg-slate-300/70 border-slate-400 text-slate-700",
} as const;

/** Leyenda completa en es-AR para agenda y pagos. */
export const LEYENDA_ESTADOS: readonly LeyendaEstado[] =
[
  { estado: "pendiente", titulo: "Pendiente", descripcion: "Con seña, esperando el pago", clase: ESTADO_BADGE.pendiente },
  { estado: "confirmado", titulo: "Confirmado", descripcion: "Sin seña, se paga presencial", clase: ESTADO_BADGE.confirmado },
  { estado: "pagado", titulo: "Pagado", descripcion: "Seña cobrada", clase: ESTADO_BADGE.pagado },
  { estado: "completado", titulo: "Completado", descripcion: "Turno ya realizado", clase: ESTADO_BADGE.completado },
  { estado: "ausente", titulo: "Ausente", descripcion: "El cliente no vino", clase: ESTADO_BADGE.ausente },
  { estado: "cancelado", titulo: "Cancelado", descripcion: "Turno cancelado", clase: ESTADO_BADGE.cancelado },
];

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
