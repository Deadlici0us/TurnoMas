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

export interface CalendarBusyInterval
{
  readonly start: Date;
  readonly end: Date;
}

export interface CalendarExternalEvent
{
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly inicio: Date;
  readonly fin: Date;
}

export interface ICalendarProvider
{
  createEvent(input: CalendarEventInput, accessToken: string): Promise<CreatedCalendarEvent>;
  updateEvent(eventId: string, input: CalendarEventInput, accessToken: string): Promise<void>;
  deleteEvent(eventId: string, accessToken: string): Promise<void>;
  /** Ocupación (freebusy) del calendario primario en una ventana. */
  queryFreeBusy(desde: Date, hasta: Date, accessToken: string): Promise<CalendarBusyInterval[]>;
  /** Eventos del calendario primario en una ventana (singleEvents). */
  listEvents(desde: Date, hasta: Date, accessToken: string): Promise<CalendarExternalEvent[]>;
}

/** Doble de test en memoria: registra eventos sin red. */
export class FakeCalendarProvider implements ICalendarProvider
{
  readonly created: Array<{ input: CalendarEventInput; accessToken: string }> = [];
  readonly updated: Array<{ eventId: string; input: CalendarEventInput }> = [];
  readonly deleted: string[] = [];
  /** Ocupación simulada para tests de bloqueo por eventos. */
  readonly busy: CalendarBusyInterval[] = [];
  /** Eventos simulados para tests de grilla. */
  readonly external: CalendarExternalEvent[] = [];
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

  async queryFreeBusy(_desde: Date, _hasta: Date, _accessToken: string): Promise<CalendarBusyInterval[]>
  {
    void _desde;
    void _hasta;
    void _accessToken;

    return [...this.busy];
  }

  async listEvents(_desde: Date, _hasta: Date, _accessToken: string): Promise<CalendarExternalEvent[]>
  {
    void _desde;
    void _hasta;
    void _accessToken;

    return [...this.external];
  }
}
