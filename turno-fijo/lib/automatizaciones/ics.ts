/**
 * Archivos .ics y link de Google Calendar (Módulo 5).
 *
 * Funciones puras para TDD. El portal devuelve el link y el .ics
 * en la respuesta de reserva; el cliente los ofrece como descarga
 * porque el portal solo captura WhatsApp (sin email del cliente).
 */

export interface IcsInput
{
  readonly titulo: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly descripcion?: string;
  readonly ubicacion?: string;
}

export interface GCalInput
{
  readonly titulo: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly descripcion?: string;
  readonly ubicacion?: string;
}

function aFormatoUtc(fecha: Date): string
{
  const iso = fecha.toISOString();

  if (Number.isNaN(fecha.getTime()))
  {
    throw new RangeError("La fecha del turno no es válida.");
  }

  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escaparIcs(texto: string): string
{
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Construye el contenido de un archivo .ics con el turno. */
export function construirICS(input: IcsInput): string
{
  if (input.titulo.trim().length === 0)
  {
    throw new RangeError("El título del evento no puede estar vacío.");
  }

  if (!(input.inicio instanceof Date) || !(input.fin instanceof Date)
    || Number.isNaN(input.inicio.getTime()) || Number.isNaN(input.fin.getTime()))
  {
    throw new RangeError("La fecha del turno no es válida.");
  }

  if (input.fin.getTime() <= input.inicio.getTime())
  {
    throw new RangeError("El fin del turno debe ser posterior al inicio.");
  }

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TurnoFijo//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-turnofijo@turnofijo`,
    `DTSTAMP:${aFormatoUtc(new Date())}`,
    `DTSTART:${aFormatoUtc(input.inicio)}`,
    `DTEND:${aFormatoUtc(input.fin)}`,
    `SUMMARY:${escaparIcs(input.titulo)}`,
  ];

  if (input.descripcion !== undefined && input.descripcion.length > 0)
  {
    lineas.push(`DESCRIPTION:${escaparIcs(input.descripcion)}`);
  }

  if (input.ubicacion !== undefined && input.ubicacion.length > 0)
  {
    lineas.push(`LOCATION:${escaparIcs(input.ubicacion)}`);
  }

  lineas.push("END:VEVENT", "END:VCALENDAR");

  return `${lineas.join("\r\n")}\r\n`;
}

/** Construye el link de plantilla de Google Calendar para el turno. */
export function construirLinkGoogleCalendar(input: GCalInput): string
{
  const formato = (fecha: Date): string =>
    fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.titulo,
    dates: `${formato(input.inicio)}/${formato(input.fin)}`,
  });

  if (input.descripcion !== undefined && input.descripcion.length > 0)
  {
    params.set("details", input.descripcion);
  }

  if (input.ubicacion !== undefined && input.ubicacion.length > 0)
  {
    params.set("location", input.ubicacion);
  }

  return `https://calendar.google.com/calendar/render?${params.toString().replace(/\+/g, "%20")}`;
}
