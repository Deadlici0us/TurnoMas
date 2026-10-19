/**
 * Sincronización y aviso de un turno confirmado (App → Google Calendar + email).
 *
 * Compartido por el flujo público (`POST /api/reservas`) y el alta manual del
 * dashboard. Best-effort: la reserva ya existe aunque falle Google o el email.
 */

import { readEnv } from "@/lib/env/env";
import { incluyeComodinLink, resolverPlantilla } from "@/lib/notifications/custom-templates";
import { ResendAdapter } from "@/lib/ports/email";
import { buildTurnoEvent, calendarService } from "@/lib/services/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona } from "@/lib/timezone/timezone";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

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

/** Formatea fecha/hora en hora del negocio (DD/MM/YYYY HH:mm). */
export function formatearFechaEnZona(fecha: Date, timeZone: string): string
{
  const etiqueta = formatearEnZona(fecha, timeZone);
  const [diaMes, hora] = etiqueta.split(" ");
  const [dia, mes] = (diaMes ?? "").split("/");

  return `${dia}/${mes}/${fecha.getFullYear()} ${hora ?? ""}`.trim();
}

/**
 * Crea el evento en Google Calendar del negocio y, si hay email, envía la
 * confirmación con el link de cancelación.
 *
 * @param params Datos del turno confirmado.
 */
export async function sincronizarTurnoConfirmado(params: SincronizarTurnoConfirmadoParams): Promise<void>
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
  catch
  {
    // Best-effort: la reserva ya existe aunque falle Google.
  }

  if (params.email === null)
  {
    return;
  }

  try
  {
    const base = readEnv("NEXT_PUBLIC_APP_URL") ?? (readEnv("VERCEL_URL") !== null
      ? `https://${readEnv("VERCEL_URL") as string}` : null);
    const secreto = readEnv("CANCELACION_SECRET");
    let cancelacionUrl = "";
    const { construirLinkCancelacion, firmarTokenCancelacion } = await import("@/lib/cancelacion/token");

    if (base !== null && secreto !== null && secreto.trim().length >= 16)
    {
      const token = firmarTokenCancelacion({
        turnoId: params.turnoId,
        clienteId: params.clienteId,
        inicio: params.inicio,
      }, secreto);

      cancelacionUrl = construirLinkCancelacion(stripTrailingSlashes(base), params.turnoId, token);
    }

    const datos = {
      cliente: params.clienteNombre,
      negocio: params.negocioNombre,
      servicio: params.servicioNombre,
      profesional: params.staffNombre,
      fecha: formatearFechaEnZona(params.inicio, params.timeZone),
    };
    const cuerpoBase = typeof params.plantillaCuerpo === "string" && params.plantillaCuerpo.trim().length > 0
      ? params.plantillaCuerpo
      : null;
    const cancelaLinea = cancelacionUrl.length > 0
      && (cuerpoBase === null || !incluyeComodinLink(cuerpoBase, "link_cancelacion"))
      ? "\nSi no podés venir, cancelá acá: {link_cancelacion}"
      : "";
    const plantilla = resolverPlantilla("confirmacion", {
      subject: params.plantillaSubject,
      cuerpo: cuerpoBase === null
        ? `Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} ` +
          `en {negocio} está confirmada.${cancelaLinea}`
        : `${cuerpoBase}${cancelaLinea}`,
    }, datos, { cancelacion: cancelacionUrl });

    await new ResendAdapter().send({
      to: params.email,
      subject: plantilla.subject,
      fromName: params.negocioNombre,
      html: plantilla.html,
    });
  }
  catch
  {
    // Best-effort: la reserva ya existe aunque falle el email.
  }
}
