/**
 * Adaptador Google Calendar para ICalendarProvider (PLAN.md Módulo 3).
 *
 * Sync unidireccional App → GCal con `calendar.events`. Recibe un
 * `access_token` corto ya refrescado; el refresh vive en el servicio.
 */

import type { CalendarEventInput, CalendarExternalEvent, CreatedCalendarEvent, ICalendarProvider } from "@/lib/ports/calendar";
import type { CalendarBusyInterval } from "@/lib/ports/calendar";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

function toGcalEvent(input: CalendarEventInput): Record<string, unknown>
{
  return {
    summary: input.titulo,
    description: input.descripcion ?? undefined,
    location: input.ubicacion ?? undefined,
    start: { dateTime: input.inicio.toISOString() },
    end: { dateTime: input.fin.toISOString() },
  };
}

/** Adaptador real: crea/actualiza/borra/lee eventos vía REST (sin SDK). */
export class GoogleCalendarAdapter implements ICalendarProvider
{
  async createEvent(input: CalendarEventInput, accessToken: string): Promise<CreatedCalendarEvent>
  {
    const response = await fetch(`${GCAL_API_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGcalEvent(input)),
    });

    if (!response.ok)
    {
      throw new Error("No pudimos crear el evento en Google Calendar.");
    }

    const data = (await response.json()) as { id?: string };

    if (!data.id)
    {
      throw new Error("Respuesta inválida de Google Calendar al crear el evento.");
    }

    return { id: data.id };
  }

  async updateEvent(eventId: string, input: CalendarEventInput, accessToken: string): Promise<void>
  {
    const response = await fetch(`${GCAL_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toGcalEvent(input)),
    });

    if (!response.ok)
    {
      throw new Error("No pudimos actualizar el evento en Google Calendar.");
    }
  }

  async deleteEvent(eventId: string, accessToken: string): Promise<void>
  {
    const response = await fetch(`${GCAL_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404)
    {
      throw new Error("No pudimos borrar el evento en Google Calendar.");
    }
  }

  async queryFreeBusy(desde: Date, hasta: Date, accessToken: string): Promise<CalendarBusyInterval[]>
  {
    const response = await fetch(`${GCAL_API_BASE}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: desde.toISOString(),
        timeMax: hasta.toISOString(),
        items: [{ id: "primary" }],
      }),
    });

    if (!response.ok)
    {
      throw new Error("No pudimos leer la ocupación de Google Calendar.");
    }

    const data = (await response.json()) as {
      calendars?: Record<string, { busy?: Array<{ start?: unknown; end?: unknown }> }>;
    };
    const busy = data.calendars?.primary?.busy ?? [];

    return busy.flatMap((slot) =>
    {
      if (typeof slot.start !== "string" || typeof slot.end !== "string")
      {
        return [];
      }

      const start = new Date(slot.start);
      const end = new Date(slot.end);

      return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? [] : [{ start, end }];
    });
  }

  async listEvents(desde: Date, hasta: Date, accessToken: string): Promise<CalendarExternalEvent[]>
  {
    const params = new URLSearchParams({
      timeMin: desde.toISOString(),
      timeMax: hasta.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const response = await fetch(`${GCAL_API_BASE}/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok)
    {
      throw new Error("No pudimos leer los eventos de Google Calendar.");
    }

    const data = (await response.json()) as {
      items?: Array<{
        id?: unknown; summary?: unknown; description?: unknown;
        start?: { dateTime?: unknown; date?: unknown }; end?: { dateTime?: unknown; date?: unknown };
      }>;
    };

    return (data.items ?? []).flatMap((item) =>
    {
      const rawStart = item.start?.dateTime ?? item.start?.date;
      const rawEnd = item.end?.dateTime ?? item.end?.date;

      if (typeof item.id !== "string" || typeof rawStart !== "string" || typeof rawEnd !== "string")
      {
        return [];
      }

      const inicio = new Date(rawStart);
      const fin = new Date(rawEnd);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()))
      {
        return [];
      }

      return [{
        id: item.id,
        titulo: typeof item.summary === "string" ? item.summary : "(sin título)",
        descripcion: typeof item.description === "string" ? item.description : null,
        inicio,
        fin,
      }];
    });
  }
}
