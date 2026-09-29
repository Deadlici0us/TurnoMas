/**
 * Plantillas de email transaccional en es-AR (Módulo 5).
 *
 * Funciones puras para TDD: reciben datos ya formateados y devuelven
 * subject + html con voseo. El envío vive en `IEmailProvider`.
 */

export interface EmailTemplate
{
  readonly subject: string;
  readonly html: string;
}

export interface DatosTurno
{
  readonly negocio: string;
  readonly servicio: string;
  readonly profesional: string;
  readonly fecha: string;
}

function escapeHtml(value: string): string
{
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function layout(titulo: string, cuerpo: string): string
{
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">` +
    `<h2>${escapeHtml(titulo)}</h2>${cuerpo}` +
    `<p style="color:#64748b;font-size:12px">Enviado por TurnoMas</p></div>`;
}

/** Confirmación de reserva con botón de Google Calendar. */
export function plantillaConfirmacion(input: DatosTurno & { gcalUrl: string }): EmailTemplate
{
  const html = layout(`Tu reserva en ${input.negocio} está confirmada`,
    `<p>Hola, reservaste <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} para el ${escapeHtml(input.fecha)}.</p>` +
    `<p><a href="${escapeHtml(input.gcalUrl)}">Agregar a Google Calendar</a> ` +
    `o descargá el archivo .ics adjunto para agendarlo.</p>` +
    `<p>Si no podés venir, cancelá tu turno para liberar el lugar. ¡Te esperamos!</p>`);

  return { subject: `Reserva confirmada en ${input.negocio}`, html };
}

/** Recordatorio 24h antes del turno. */
export function plantillaRecordatorio(input: DatosTurno): EmailTemplate
{
  const html = layout("Te recordamos tu turno de mañana",
    `<p>Hola, te esperamos mañana ${escapeHtml(input.fecha)} para ` +
    `<strong>${escapeHtml(input.servicio)}</strong> con ${escapeHtml(input.profesional)} ` +
    `en ${escapeHtml(input.negocio)}.</p>` +
    `<p>Si no podés venir, cancelá tu turno para liberar el lugar.</p>`);

  return { subject: `Recordatorio: tu turno en ${input.negocio} es mañana`, html };
}

/** Boomerang: invita a renovar el servicio X días después. */
export function plantillaRemarketing(input: DatosTurno & { portalUrl: string }): EmailTemplate
{
  const html = layout(`¿Renovamos tu ${input.servicio}?`,
    `<p>Hola, pasó un tiempo desde tu última visita a ${escapeHtml(input.negocio)}. ` +
    `Te invitamos a renovar tu <strong>${escapeHtml(input.servicio)}</strong>.</p>` +
    `<p><a href="${escapeHtml(input.portalUrl)}">Reservar de nuevo</a></p>`);

  return { subject: `¿Renovamos tu ${input.servicio}?`, html };
}

/** Recolector de reseñas 2h post-turno. */
export function plantillaResena(input: DatosTurno & { resenaUrl: string }): EmailTemplate
{
  const html = layout("¿Cómo te fue en tu turno?",
    `<p>Hola, contanos tu opinión sobre <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} en ${escapeHtml(input.negocio)}.</p>` +
    `<p><a href="${escapeHtml(input.resenaUrl)}">Calificar del 1 al 5</a></p>`);

  return { subject: `¿Cómo te fue en ${input.negocio}? Dejanos tu opinión`, html };
}
