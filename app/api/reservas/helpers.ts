/**
 * Lógica testeable de la reserva pública (Módulo 2).
 *
 * Vive fuera de `route.ts` porque Next App Router solo permite exportar
 * handlers (`GET`/`POST`/...) y segment config desde un `route.ts`;
 * cualquier otro export en runtime rompe `next build` con
 * "Invalid segment configuration export detected".
 */

import { evaluateCustomer } from "@/lib/blacklist/blacklist";
import type { BlacklistPenalty } from "@/lib/blacklist/blacklist";
import { getBlockedInterval } from "@/lib/availability/availability";
import { BUFFER_MINUTOS } from "@/lib/booking/slots";
import { resolveCheckout } from "@/lib/checkout/checkout";
import { calcularMontosReserva } from "@/lib/reservas/montos";
import { esEmailValido } from "@/lib/validation/email";
import { limpiarControl } from "@/lib/validation/texto";

const WHATSAPP_PATTERN = /^\+?[\d\s-]{7,}$/;
const NOMBRE_MINIMO = 2;

export interface ReservaBody
{
  readonly pais: unknown;
  readonly slug: unknown;
  readonly staffId: unknown;
  readonly servicioId: unknown;
  readonly inicio: unknown;
  readonly nombre: unknown;
  readonly whatsapp: unknown;
  readonly email: unknown;
}

export interface ReservaValidada
{
  readonly pais: string;
  readonly slug: string;
  readonly staffId: string;
  readonly servicioId: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string | null;
  readonly inicio: Date;
}

function exigirTexto(valor: unknown, mensaje: string): string
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    throw new RangeError(mensaje);
  }

  return valor.trim();
}

function exigirNombre(valor: unknown): string
{
  const nombre = limpiarControl(exigirTexto(valor, "Contanos tu nombre para confirmar la reserva."));

  if (nombre.length < NOMBRE_MINIMO)
  {
    throw new RangeError("Contanos tu nombre para confirmar la reserva.");
  }

  return nombre.slice(0, 80);
}

function exigirWhatsapp(valor: unknown): string
{
  const whatsapp = exigirTexto(valor, "Revisá tu WhatsApp para que te lleguen los recordatorios.");

  if (!WHATSAPP_PATTERN.test(whatsapp))
  {
    throw new RangeError("Revisá tu WhatsApp para que te lleguen los recordatorios.");
  }

  return whatsapp;
}

function exigirInicio(valor: unknown): Date
{
  if (typeof valor !== "string")
  {
    throw new RangeError("Elegí un horario válido para tu reserva.");
  }

  const inicio = new Date(valor);

  if (Number.isNaN(inicio.getTime()))
  {
    throw new RangeError("Elegí un horario válido para tu reserva.");
  }

  const minimo = Date.now() + BUFFER_MINUTOS * 60_000;

  if (inicio.getTime() <= minimo)
  {
    throw new RangeError("Elegí un horario con al menos 30 min de anticipación.");
  }

  return inicio;
}

/** Email opcional del cliente (para confirmación y recordatorios). */
function exigirEmailOpcional(valor: unknown): string | null
{
  if (valor === undefined || valor === null)
  {
    return null;
  }

  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return null;
  }

  const email = valor.trim().toLowerCase().slice(0, 120);

  if (!esEmailValido(email))
  {
    throw new RangeError("Revisá tu email para que te lleguen las confirmaciones.");
  }

  return email;
}

/**
 * Parsea y valida el cuerpo de la reserva.
 *
 * @param body Cuerpo crudo del request.
 * @return Campos validados.
 */
export function parseReservaBody(body: ReservaBody): ReservaValidada
{
  return {
    pais: exigirTexto(body.pais, "Falta el país del negocio.").toLowerCase(),
    slug: exigirTexto(body.slug, "Falta el negocio.").toLowerCase(),
    staffId: exigirTexto(body.staffId, "Elegí un profesional para tu reserva."),
    servicioId: exigirTexto(body.servicioId, "Elegí un servicio para tu reserva."),
    nombre: exigirNombre(body.nombre),
    whatsapp: exigirWhatsapp(body.whatsapp),
    email: exigirEmailOpcional(body.email),
    inicio: exigirInicio(body.inicio),
  };
}

/**
 * Indica si el negocio exige email al reservar.
 *
 * Se exige cuando tiene reseñas o recordatorios activos (default true). Estos
 * features avisan al cliente por email, así que sin email el negocio pierde la
 * entrega. Si el dueño desactiva ambos, el email pasa a ser opcional.
 *
 * @param negocio Fila del negocio (o null).
 * @return Verdadero cuando el email es obligatorio.
 */
export function requiereEmailObligatorio(
  negocio: { readonly resena_activa?: unknown; readonly recordatorio_activo?: unknown } | null,
): boolean
{
  const resena = negocio?.resena_activa !== false;
  const recordatorio = negocio?.recordatorio_activo !== false;

  return resena || recordatorio;
}

/**
 * Indica si un turno existente retiene su slot durante la gracia de pago.
 *
 * @param estado Estado del turno.
 * @param createdAt Fecha de creación ISO.
 * @param ahoraMs Ahora en milisegundos.
 * @return Verdadero cuando bloquea agenda.
 */
export function retieneSlot(estado: string, createdAt: string, ahoraMs: number): boolean
{
  if (estado === "confirmado" || estado === "pagado")
  {
    return true;
  }

  if (estado !== "pendiente")
  {
    return false;
  }

  const creado = new Date(createdAt).getTime();

  return !Number.isNaN(creado) && ahoraMs - creado < 15 * 60_000;
}

/**
 * Filtra los turnos existentes a intervalos de bloqueo.
 *
 * @param turnos Turnos futuros del staff.
 * @param duracionPorServicio Mapa de duraciones por servicio.
 * @param duracionDefault Duración del servicio actual.
 * @param ahoraMs Ahora en milisegundos.
 * @return Intervalos que bloquean agenda.
 */
export function filtrarBloqueos(
  turnos: ReadonlyArray<{ readonly inicio: string; readonly servicio_id: string;
    readonly estado: string; readonly created_at: string }>,
  duracionPorServicio: ReadonlyMap<string, { readonly duracion_min: number }>,
  duracionDefault: number,
  ahoraMs: number,
): Array<{ readonly start: Date; readonly end: Date }>
{
  return turnos
    .filter((t) => retieneSlot(t.estado, t.created_at, ahoraMs))
    .map((t) =>
    {
      const ref = duracionPorServicio.get(t.servicio_id);

      return getBlockedInterval(new Date(t.inicio), ref?.duracion_min ?? duracionDefault);
    });
}

/**
 * Evalúa lista negra, checkout y montos de la reserva.
 *
 * @param negocioFull Fila del negocio.
 * @param ausencias Ausencias previas del cliente.
 * @param servicioRow Fila del servicio.
 * @return Decisión, checkout y montos.
 */
export function evaluarRiesgo(
  negocioFull: unknown,
  ausencias: number,
  servicioRow: {
    readonly sena_requerida: boolean;
    readonly sena_porcentaje: number;
    readonly precio_base: number;
    readonly precio_promocional: number | null;
  },
): {
  readonly decision: ReturnType<typeof evaluateCustomer>;
  readonly outcome: ReturnType<typeof resolveCheckout>;
  readonly montos: ReturnType<typeof calcularMontosReserva>;
  readonly negocioRow: {
    readonly blacklist_umbral?: unknown;
    readonly blacklist_penalidad?: unknown;
    readonly msg_confirmacion_subject?: unknown;
    readonly msg_confirmacion_cuerpo?: unknown;
  } | null;
}
{
  const negocioRow = negocioFull as {
    blacklist_umbral?: unknown; blacklist_penalidad?: unknown;
    msg_confirmacion_subject?: unknown; msg_confirmacion_cuerpo?: unknown;
  } | null;
  const umbral = typeof negocioRow?.blacklist_umbral === "number" ? negocioRow.blacklist_umbral : 2;
  const penalidad = (negocioRow?.blacklist_penalidad as BlacklistPenalty | undefined)
    ?? "fullDeposit";
  const decision = evaluateCustomer(ausencias, { maxAllowedAbsences: umbral, penaltyOnExceed: penalidad });
  const outcome = resolveCheckout({
    serviceRequiresDeposit: servicioRow.sena_requerida,
    serviceDepositPercentage: servicioRow.sena_porcentaje,
    blacklistDecision: decision,
  });
  const montos = calcularMontosReserva({
    precioBase: servicioRow.precio_base,
    precioPromocional: servicioRow.precio_promocional,
    senaRequerida: servicioRow.sena_requerida,
    senaPorcentaje: servicioRow.sena_porcentaje,
    senaForzadaPorListaNegra: decision === "fullDeposit",
  });

  return { decision, outcome, montos, negocioRow };
}
