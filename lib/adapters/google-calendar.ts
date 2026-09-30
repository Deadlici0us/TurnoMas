/**
 * Adaptador Google Calendar para ICalendarProvider (PLAN.md Módulo 3).
 *
 * Sync unidireccional App → GCal con `calendar.events`. Recibe un
 * `access_token` corto ya refrescado; el refresh vive en el servicio.
 */

import type { CalendarEventInput, CreatedCalendarEvent, ICalendarProvider } from "@/lib/ports/calendar";

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

/** Adaptador real: crea/actualiza/borra eventos vía REST (sin SDK). */
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
}
