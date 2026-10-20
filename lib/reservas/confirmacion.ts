/**
 * Sincronización y aviso de un turno (App → Google Calendar + email).
 *
 * Compartido por el flujo público (`POST /api/reservas`) y el alta manual del
 * dashboard. Best-effort: la reserva ya existe aunque falle Google o el email,
 * pero el resultado del envío se devuelve para que la UI no mienta al cliente.
 */

import { readEnv } from "@/lib/env/env";
import { incluyeComodinLink, resolverPlantilla } from "@/lib/notifications/custom-templates";
import { ResendAdapter } from "@/lib/ports/email";
import { buildTurnoEvent, calendarService } from "@/lib/services/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona } from "@/lib/timezone/timezone";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

/** Motivo por el que el email de confirmación no se pudo enviar. */
export type MotivoEnvioEmail = "enviado" | "sin_email" | "error";

/** Resultado observable del envío de la confirmación. */
export interface ResultadoEnvioEmail
{
  readonly enviado: boolean;
  readonly motivo: MotivoEnvioEmail;
}

/** Datos del turno confirmado a sincronizar y avisar. */
export interface SincronizarTurnoConfirmadoParams
{
  readonly negocioId: string;
  readonly negocioNombre: string;
  readonly servicioNombre: string;
  readonly staffNombre: string;
  readonly clienteId: string;
  readonly clienteNombre: string;
  readonly whatsapp: string;
  readonly email: string | null;
  readonly inicio: Date;
  readonly fin: Date;
  readonly turnoId: string;
  readonly timeZone: string;
  readonly plantillaSubject: unknown;
  readonly plantillaCuerpo: unknown;
}

/** Datos del email de confirmación (turno confirmado o pendiente con seña). */
export interface DatosEmailConfirmacion
{
  readonly negocioId: string;
  readonly negocioNombre: string;
  readonly servicioNombre: string;
  readonly staffNombre: string;
  readonly clienteId: string;
  readonly clienteNombre: string;
  readonly email: string;
  readonly inicio: Date;
  readonly timeZone: string;
  readonly turnoId: string;
  readonly plantillaSubject: unknown;
  readonly plantillaCuerpo: unknown;
  readonly estado: "confirmada" | "pendiente";
  readonly checkoutUrl?: string | null;
}

/** Formatea fecha/hora en hora del negocio (DD/MM/YYYY HH:mm). */
export function formatearFechaEnZona(fecha: Date, timeZone: string): string
{
  const etiqueta = formatearEnZona(fecha, timeZone);
  const [diaMes, hora] = etiqueta.split(" ");
  const [dia, mes] = (diaMes ?? "").split("/");

  return `${dia}/${mes}/${fecha.getFullYear()} ${hora ?? ""}`.trim();
}

/**
 * Arma el link mágico de cancelación cuando hay base y secreto configurados.
 *
 * @param params Datos del turno.
 * @return URL de cancelación, o cadena vacía si falta configuración.
 */
async function linkCancelacion(params: DatosEmailConfirmacion): Promise<string>
{
  const base = readEnv("NEXT_PUBLIC_APP_URL") ?? (readEnv("VERCEL_URL") !== null
    ? `https://${readEnv("VERCEL_URL") as string}` : null);
  const secreto = readEnv("CANCELACION_SECRET");

  if (base === null || secreto === null || secreto.trim().length < 16)
  {
    return "";
  }

  const { construirLinkCancelacion, firmarTokenCancelacion } = await import("@/lib/cancelacion/token");
  const token = firmarTokenCancelacion({
    turnoId: params.turnoId,
    clienteId: params.clienteId,
    inicio: params.inicio,
  }, secreto);

  return construirLinkCancelacion(stripTrailingSlashes(base), params.turnoId, token);
}

/**
 * Envía la confirmación por email y devuelve si Resend la aceptó.
 *
 * Nunca lanza: la reserva ya está guardada. Un fallo queda logueado con el
 * turno y el negocio para poder diagnosticarlo en Vercel.
 *
 * @param params Datos del email.
 * @return Resultado del envío.
 */
export async function enviarEmailConfirmacion(
  params: DatosEmailConfirmacion,
): Promise<ResultadoEnvioEmail>
{
  try
  {
    const cancelacionUrl = await linkCancelacion(params);
    const cuerpoBase = typeof params.plantillaCuerpo === "string" && params.plantillaCuerpo.trim().length > 0
      ? params.plantillaCuerpo
      : null;
    const pagoLinea = params.estado === "pendiente" && typeof params.checkoutUrl === "string"
      && params.checkoutUrl.length > 0
      ? `\nPagá tu seña acá: ${params.checkoutUrl}`
      : "";
    const cancelaLinea = cancelacionUrl.length > 0
      && (cuerpoBase === null || !incluyeComodinLink(cuerpoBase, "link_cancelacion"))
      ? "\nSi no podés venir, cancelá acá: {link_cancelacion}"
      : "";
    const datos = {
      cliente: params.clienteNombre,
      negocio: params.negocioNombre,
      servicio: params.servicioNombre,
      profesional: params.staffNombre,
      fecha: formatearFechaEnZona(params.inicio, params.timeZone),
    };
    const cuerpoDefault = params.estado === "pendiente"
      ? `Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} ` +
        `en {negocio} está casi lista.${pagoLinea}${cancelaLinea}`
      : `Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} ` +
        `en {negocio} está confirmada.${cancelaLinea}`;
    const plantilla = resolverPlantilla("confirmacion", {
      subject: params.plantillaSubject,
      cuerpo: cuerpoBase === null ? cuerpoDefault : `${cuerpoBase}${pagoLinea}${cancelaLinea}`,
    }, datos, { cancelacion: cancelacionUrl });

    await new ResendAdapter().send({
      to: params.email,
      subject: plantilla.subject,
      fromName: params.negocioNombre,
      html: plantilla.html,
    });

    return { enviado: true, motivo: "enviado" };
  }
  catch (error)
  {
    console.error("[reservas] no se pudo enviar el email de confirmación", {
      turnoId: params.turnoId,
      negocioId: params.negocioId,
      detalle: error instanceof Error ? error.message : "error desconocido",
    });

    return { enviado: false, motivo: "error" };
  }
}

/**
 * Crea el evento en Google Calendar del negocio y envía la confirmación.
 *
 * @param params Datos del turno confirmado.
 * @return Resultado del envío del email.
 */
export async function sincronizarTurnoConfirmado(
  params: SincronizarTurnoConfirmadoParams,
): Promise<ResultadoEnvioEmail>
{
  const admin = getSupabaseAdmin();

  try
  {
    const gcalEventId = await calendarService.createEventForNegocio(params.negocioId, {
      ...buildTurnoEvent({
        negocio: params.negocioNombre,
        servicio: params.servicioNombre,
        profesional: params.staffNombre,
        cliente: params.clienteNombre,
        whatsapp: params.whatsapp,
        inicio: params.inicio,
        fin: params.fin,
      }),
      timeZone: params.timeZone,
    });

    if (gcalEventId !== null)
    {
      await admin.from("turnos").update({ google_calendar_event_id: gcalEventId })
        .eq("id", params.turnoId);
    }
  }
  catch (error)
  {
    console.error("[reservas] no se pudo sincronizar Google Calendar", {
      turnoId: params.turnoId,
      negocioId: params.negocioId,
      detalle: error instanceof Error ? error.message : "error desconocido",
    });
  }

  if (params.email === null)
  {
    return { enviado: false, motivo: "sin_email" };
  }

  return enviarEmailConfirmacion({
    negocioId: params.negocioId,
    negocioNombre: params.negocioNombre,
    servicioNombre: params.servicioNombre,
    staffNombre: params.staffNombre,
    clienteId: params.clienteId,
    clienteNombre: params.clienteNombre,
    email: params.email,
    inicio: params.inicio,
    timeZone: params.timeZone,
    turnoId: params.turnoId,
    plantillaSubject: params.plantillaSubject,
    plantillaCuerpo: params.plantillaCuerpo,
    estado: "confirmada",
  });
}

/** Datos para avisar una reserva pendiente de seña (link de pago incluido). */
export interface EnviarReservaPendienteParams
{
  readonly negocioId: string;
  readonly negocioNombre: string;
  readonly servicioNombre: string;
  readonly staffNombre: string;
  readonly clienteId: string;
  readonly clienteNombre: string;
  readonly email: string;
  readonly inicio: Date;
  readonly timeZone: string;
  readonly turnoId: string;
  readonly checkoutUrl: string | null;
  readonly plantillaSubject: unknown;
  readonly plantillaCuerpo: unknown;
}

/**
 * Envía el email de una reserva pendiente con seña (link de pago + cancelación).
 *
 * @param params Datos de la reserva pendiente.
 * @return Resultado del envío.
 */
export async function enviarEmailReservaPendiente(
  params: EnviarReservaPendienteParams,
): Promise<ResultadoEnvioEmail>
{
  return enviarEmailConfirmacion({
    negocioId: params.negocioId,
    negocioNombre: params.negocioNombre,
    servicioNombre: params.servicioNombre,
    staffNombre: params.staffNombre,
    clienteId: params.clienteId,
    clienteNombre: params.clienteNombre,
    email: params.email,
    inicio: params.inicio,
    timeZone: params.timeZone,
    turnoId: params.turnoId,
    plantillaSubject: params.plantillaSubject,
    plantillaCuerpo: params.plantillaCuerpo,
    estado: "pendiente",
    checkoutUrl: params.checkoutUrl,
  });
}
