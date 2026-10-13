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

/** Badge compacto (listas y tabla de pagos) — oscuro unificado. */
export const ESTADO_BADGE: Record<EstadoTurno, string> =
{
  pagado: "bg-green-500/15 text-green-300 border-green-500/30",
  confirmado: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pendiente: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completado: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  cancelado: "bg-white/10 text-slate-400 border-white/10",
  ausente: "bg-red-500/15 text-red-300 border-red-500/30",
};

/** Bloque de la grilla semanal (más saturado para verse sobre la grilla oscura). */
export const ESTADO_GRILLA: Record<EstadoTurno, string> =
{
  pendiente: "bg-amber-500/25 border-amber-400/40 text-amber-100",
  confirmado: "bg-blue-500/25 border-blue-400/40 text-blue-100",
  pagado: "bg-green-500/25 border-green-400/40 text-green-100",
  completado: "bg-indigo-500/25 border-indigo-400/40 text-indigo-100",
  ausente: "bg-red-500/25 border-red-400/40 text-red-100",
  cancelado: "bg-white/10 border-white/15 text-slate-400 line-through",
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
  clase: "bg-white/10 border-white/20 text-slate-300",
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
