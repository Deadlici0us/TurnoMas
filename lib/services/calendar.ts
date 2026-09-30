/**
 * Servicio de calendario por negocio: resuelve `refresh_token`, refresca el
 * `access_token` corto y delega en el proveedor (Google por defecto).
 * Best-effort: si el negocio no conectó o Google falla, devuelve null/[]
 * sin lanzar. Un solo calendario por negocio (decisión de producto).
 */

import { GoogleCalendarAdapter } from "@/lib/adapters/google-calendar";
import { refreshAccessToken } from "@/lib/calendar/google-oauth";
import { readEnv } from "@/lib/env/env";
import type { CalendarBusyInterval, CalendarEventInput, CalendarExternalEvent,
  ICalendarProvider } from "@/lib/ports/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface TurnoEventoInput
{
  readonly negocio: string;
  readonly servicio: string;
  readonly profesional: string;
  readonly cliente: string;
  readonly whatsapp: string;
  readonly inicio: Date;
  readonly fin: Date;
}

/** Marca que identifica eventos creados por TurnoMas (para no duplicar). */
export const TURNOMAS_EVENT_MARK = "Reserva TurnoMas";

/** Arma el payload del evento de un turno (push App → GCal). */
export function buildTurnoEvent(input: TurnoEventoInput): CalendarEventInput
{
  return {
    titulo: `${input.servicio} en ${input.negocio} · ${input.cliente}`,
    descripcion: `${TURNOMAS_EVENT_MARK} · ${input.servicio} con ${input.profesional} · ` +
      `Cliente ${input.cliente} (${input.whatsapp})`,
    ubicacion: input.negocio,
    inicio: input.inicio,
    fin: input.fin,
  };
}

export class CalendarService
{
  private readonly provider: ICalendarProvider;
  private readonly refreshFn: typeof refreshAccessToken;

  constructor(
    provider: ICalendarProvider | null = null,
    refreshFn: typeof refreshAccessToken = refreshAccessToken,
  )
  {
    this.provider = provider ?? new GoogleCalendarAdapter();
    this.refreshFn = refreshFn;
  }

  /** Lee el `refresh_token` del negocio (null si no conectó). */
  async getRefreshToken(negocioId: string): Promise<string | null>
  {
    try
    {
      const admin = getSupabaseAdmin();
      const { data } = await admin.from("negocio_secretos")
        .select("google_refresh_token").eq("negocio_id", negocioId).single();

      const raw = (data as { google_refresh_token?: unknown } | null)?.google_refresh_token;

      return typeof raw === "string" && raw.length > 0 ? raw : null;
    }
    catch
    {
      return null;
    }
  }

  private async resolveAccessToken(negocioId: string): Promise<string | null>
  {
    const refreshToken = await this.getRefreshToken(negocioId);

    if (refreshToken === null)
    {
      return null;
    }

    const clientId = readEnv("GOOGLE_CLIENT_ID");
    const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");

    if (clientId === null || clientSecret === null)
    {
      return null;
    }

    try
    {
      return await this.refreshFn({ refreshToken, clientId, clientSecret });
    }
    catch
    {
      return null;
    }
  }

  /** Crea el evento y devuelve su id, o null sin conexión/config. */
  async createEventForNegocio(negocioId: string, input: CalendarEventInput): Promise<string | null>
  {
    const accessToken = await this.resolveAccessToken(negocioId);

    if (accessToken === null)
    {
      return null;
    }

    try
    {
      const created = await this.provider.createEvent(input, accessToken);

      return created.id;
    }
    catch
    {
      return null;
    }
  }

  /** Actualiza el evento (best-effort, nunca lanza). */
  async updateEventForNegocio(negocioId: string, eventId: string, input: CalendarEventInput): Promise<void>
  {
    const accessToken = await this.resolveAccessToken(negocioId);

    if (accessToken === null)
    {
      return;
    }

    try
    {
      await this.provider.updateEvent(eventId, input, accessToken);
    }
    catch
    {
      // Best-effort: la agenda local manda aunque falle Google.
    }
  }

  /** Borra el evento (best-effort, nunca lanza). */
  async deleteEventForNegocio(negocioId: string, eventId: string): Promise<void>
  {
    const accessToken = await this.resolveAccessToken(negocioId);

    if (accessToken === null)
    {
      return;
    }

    try
    {
      await this.provider.deleteEvent(eventId, accessToken);
    }
    catch
    {
      // Best-effort: la agenda local manda aunque falle Google.
    }
  }

  /**
   * Ocupación del calendario del negocio en una ventana (freebusy).
   * Fail-open: sin conexión o con error devuelve [] para no bloquear ventas.
   */
  async getBusyIntervalsForNegocio(
    negocioId: string, desde: Date, hasta: Date,
  ): Promise<CalendarBusyInterval[]>
  {
    const accessToken = await this.resolveAccessToken(negocioId);

    if (accessToken === null)
    {
      return [];
    }

    try
    {
      return await this.provider.queryFreeBusy(desde, hasta, accessToken);
    }
    catch
    {
      return [];
    }
  }

  /**
   * Eventos ajenos a TurnoMas en una ventana (para la grilla semanal).
   * Filtra los creados por la app (ya se ven como turnos). Fail-open: [].
   */
  async getExternalEventsForNegocio(
    negocioId: string, desde: Date, hasta: Date,
  ): Promise<CalendarExternalEvent[]>
  {
    const accessToken = await this.resolveAccessToken(negocioId);

    if (accessToken === null)
    {
      return [];
    }

    try
    {
      const eventos = await this.provider.listEvents(desde, hasta, accessToken);

      return eventos.filter((e) => e.descripcion === null || !e.descripcion.includes(TURNOMAS_EVENT_MARK));
    }
    catch
    {
      return [];
    }
  }
}

export const calendarService = new CalendarService();
