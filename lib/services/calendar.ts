/**
 * Servicio de calendario por negocio: resuelve `refresh_token`, refresca el
 * `access_token` corto y delega en GoogleCalendarAdapter. Best-effort: si el
 * negocio no conectó, devuelve null sin lanzar.
 */

import { GoogleCalendarAdapter } from "@/lib/adapters/google-calendar";
import { refreshAccessToken } from "@/lib/calendar/google-oauth";
import { readEnv } from "@/lib/env/env";
import type { CalendarEventInput } from "@/lib/ports/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class CalendarService
{
  private adapter = new GoogleCalendarAdapter();

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

  /** Crea el evento y devuelve su id, o null sin conexión/config. */
  async createEventForNegocio(negocioId: string, input: CalendarEventInput): Promise<string | null>
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
      const accessToken = await refreshAccessToken({ refreshToken, clientId, clientSecret });
      const created = await this.adapter.createEvent(input, accessToken);

      return created.id;
    }
    catch
    {
      return null;
    }
  }

  /** Borra el evento (best-effort, nunca lanza). */
  async deleteEventForNegocio(negocioId: string, eventId: string): Promise<void>
  {
    const refreshToken = await this.getRefreshToken(negocioId);

    if (refreshToken === null)
    {
      return;
    }

    const clientId = readEnv("GOOGLE_CLIENT_ID");
    const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");

    if (clientId === null || clientSecret === null)
    {
      return;
    }

    try
    {
      const accessToken = await refreshAccessToken({ refreshToken, clientId, clientSecret });

      await this.adapter.deleteEvent(eventId, accessToken);
    }
    catch
    {
      // Best-effort: la agenda local manda aunque falle Google.
    }
  }
}

export const calendarService = new CalendarService();
