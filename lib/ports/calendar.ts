/**
 * Puerto ICalendarProvider (arquitectura hexagonal, PLAN.md 2.1).
 *
 * La implementación real (GoogleCalendarAdapter) vive en
 * `lib/adapters/`; los tests usan FakeCalendarProvider.
 */

export interface CalendarEventInput
{
  readonly titulo: string;
  readonly descripcion?: string | null;
  readonly ubicacion?: string | null;
  readonly inicio: Date;
  readonly fin: Date;
}

export interface CreatedCalendarEvent
{
  readonly id: string;
}

export interface ICalendarProvider
{
  createEvent(input: CalendarEventInput, accessToken: string): Promise<CreatedCalendarEvent>;
  updateEvent(eventId: string, input: CalendarEventInput, accessToken: string): Promise<void>;
  deleteEvent(eventId: string, accessToken: string): Promise<void>;
}

/** Doble de test en memoria: registra eventos sin red. */
export class FakeCalendarProvider implements ICalendarProvider
{
  readonly created: Array<{ input: CalendarEventInput; accessToken: string }> = [];
  readonly updated: Array<{ eventId: string; input: CalendarEventInput }> = [];
  readonly deleted: string[] = [];
  private counter = 0;

  async createEvent(input: CalendarEventInput, accessToken: string): Promise<CreatedCalendarEvent>
  {
    if (input.titulo.trim().length === 0)
    {
      throw new RangeError("El evento necesita un título.");
    }

    if (Number.isNaN(input.inicio.getTime()) || Number.isNaN(input.fin.getTime()))
    {
      throw new RangeError("El evento necesita fechas válidas.");
    }

    this.counter += 1;
    this.created.push({ input, accessToken });

    return { id: `fake-event-${this.counter}` };
  }

  async updateEvent(eventId: string, input: CalendarEventInput, _accessToken: string): Promise<void>
  {
    void _accessToken;
    this.updated.push({ eventId, input });
  }

  async deleteEvent(eventId: string, _accessToken: string): Promise<void>
  {
    void _accessToken;
    this.deleted.push(eventId);
  }
}
