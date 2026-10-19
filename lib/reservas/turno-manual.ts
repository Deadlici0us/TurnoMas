/**
 * Validación del alta manual de turnos (dashboard → Agenda → Nuevo turno).
 *
 * Función pura para TDD: el dueño carga nombre/WhatsApp/email a mano (o
 * precargados desde un cliente) y elige profesional, servicio, fecha, hora
 * y estado. La conversión fecha+hora civiles → instante UTC la resuelve
 * `instanteDesdeZonaCivil` con la zona del negocio.
 */

import { esEmailValido } from "@/lib/validation/email";
import { limpiarControl } from "@/lib/validation/texto";

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;
const WHATSAPP_PATTERN = /^\+?\d{6,20}$/;
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HORA_PATTERN = /^\d{2}:\d{2}$/;

/** Estados permitidos al crear un turno manual. */
export type EstadoTurnoManual = "confirmado" | "pagado";

/** Campos crudos del formulario de alta manual. */
export interface TurnoManualInput
{
  readonly staffId: unknown;
  readonly servicioId: unknown;
  readonly clienteId: unknown;
  readonly nombre: unknown;
  readonly whatsapp: unknown;
  readonly email: unknown;
  readonly fecha: unknown;
  readonly hora: unknown;
  readonly estado: unknown;
}

/** Campos validados y normalizados del alta manual. */
export interface TurnoManualValidado
{
  readonly staffId: string;
  readonly servicioId: string;
  readonly clienteId: string | null;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string | null;
  readonly fecha: string;
  readonly hora: string;
  readonly estado: EstadoTurnoManual;
}

function exigirTexto(valor: unknown, mensaje: string): string
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    throw new RangeError(mensaje);
  }

  return valor.trim();
}

function normalizarNombre(valor: unknown): string
{
  const nombre = limpiarControl(exigirTexto(valor, "Completá el nombre del cliente."));

  if (nombre.length < NOMBRE_MINIMO || nombre.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre tiene que tener entre 2 y 80 caracteres.");
  }

  return nombre;
}

function normalizarWhatsapp(valor: unknown): string
{
  const whatsapp = exigirTexto(valor, "Completá el WhatsApp del cliente.").replace(/[\s-]/g, "");

  if (!WHATSAPP_PATTERN.test(whatsapp))
  {
    throw new RangeError("Ese WhatsApp no parece válido.");
  }

  return whatsapp;
}

function normalizarEmail(valor: unknown): string | null
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
    throw new RangeError("Revisá el email del cliente.");
  }

  return email;
}

function normalizarClienteId(valor: unknown): string | null
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return null;
  }

  return valor.trim();
}

function normalizarEstado(valor: unknown): EstadoTurnoManual
{
  if (valor === "confirmado" || valor === "pagado")
  {
    return valor;
  }

  throw new RangeError("Elegí un estado válido para el turno.");
}

/**
 * Valida y normaliza los datos del alta manual de un turno.
 *
 * @param input Campos crudos del formulario.
 * @return Campos validados listos para persistir.
 */
export function parseTurnoManualInput(input: TurnoManualInput): TurnoManualValidado
{
  const fecha = exigirTexto(input.fecha, "Elegí una fecha válida.");
  const hora = exigirTexto(input.hora, "Elegí una hora válida.");

  if (!FECHA_PATTERN.test(fecha))
  {
    throw new RangeError("Elegí una fecha válida.");
  }

  if (!HORA_PATTERN.test(hora))
  {
    throw new RangeError("Elegí una hora válida.");
  }

  return {
    staffId: exigirTexto(input.staffId, "Elegí un profesional."),
    servicioId: exigirTexto(input.servicioId, "Elegí un servicio."),
    clienteId: normalizarClienteId(input.clienteId),
    nombre: normalizarNombre(input.nombre),
    whatsapp: normalizarWhatsapp(input.whatsapp),
    email: normalizarEmail(input.email),
    fecha,
    hora,
    estado: normalizarEstado(input.estado),
  };
}
