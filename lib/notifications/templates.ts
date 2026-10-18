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

/** Confirmación de reserva (el turno va directo al calendario del dueño). */
export function plantillaConfirmacion(input: DatosTurno): EmailTemplate
{
  const html = layout(`Tu reserva en ${input.negocio} está confirmada`,
    `<p>Hola, reservaste <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} para el ${escapeHtml(input.fecha)}.</p>` +
    `<p>Si no podés venir, cancelá tu turno para liberar el lugar. ¡Te esperamos!</p>`);

  return { subject: `Reserva confirmada en ${input.negocio}`, html };
}

/** Recordatorio 24h antes del turno (con link de cancelación si está disponible). */
export function plantillaRecordatorio(input: DatosTurno & { cancelacionUrl?: string }): EmailTemplate
{
  const cancelar = typeof input.cancelacionUrl === "string" && input.cancelacionUrl.length > 0
    ? `<p>Si no podés venir, <a href="${escapeHtml(input.cancelacionUrl)}">cancelá tu turno acá</a>.</p>`
    : "<p>Si no podés venir, cancelá tu turno para liberar el lugar.</p>";
  const html = layout("Te recordamos tu turno de mañana",
    `<p>Hola, te esperamos mañana ${escapeHtml(input.fecha)} para ` +
    `<strong>${escapeHtml(input.servicio)}</strong> con ${escapeHtml(input.profesional)} ` +
    `en ${escapeHtml(input.negocio)}.</p>` + cancelar);

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

/** Recolector de reseñas 2h post-turno (Opción B: Google para todos + privado). */
export function plantillaResena(
  input: DatosTurno & { readonly googleReviewUrl: string; readonly feedbackUrl: string },
): EmailTemplate
{
  const botonGoogle = input.googleReviewUrl.trim().length > 0
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.googleReviewUrl)}" `
      + `style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;`
      + `text-decoration:none;font-weight:600">Escribí tu reseña en Google</a></p>`
    : "";
  const botonPrivado = input.feedbackUrl.trim().length > 0
    ? `<p style="color:#64748b;font-size:14px">¿Algo para mejorar? `
      + `<a href="${escapeHtml(input.feedbackUrl)}">Contanos en privado</a></p>`
    : "";
  const html = layout("¿Cómo te fue en tu turno?",
    `<p>Hola, contanos tu opinión sobre <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} en ${escapeHtml(input.negocio)}.</p>` +
    botonGoogle + botonPrivado);

  return { subject: `¿Cómo te fue en ${input.negocio}? Dejanos tu opinión`, html };
}

export interface DatosCancelacion extends DatosTurno
{
  readonly cancelacionUrl: string;
  readonly seDevuelve: boolean;
  readonly retencionHs: number;
}

/** Confirmación de cancelación del cliente (devuelta o retenida). */
export function plantillaCancelacion(input: DatosCancelacion): EmailTemplate
{
  const destino = input.seDevuelve
    ? "Tu seña vuelve a tu cuenta en los próximos días."
    : `Al cancelar dentro de las ${input.retencionHs}hs previas, la seña queda retenida.`;
  const html = layout(`Cancelaste tu turno en ${input.negocio}`,
    `<p>Hola, cancelamos tu <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} del ${escapeHtml(input.fecha)}.</p>` +
    `<p>${escapeHtml(destino)}</p>` +
    `<p><a href="${escapeHtml(input.cancelacionUrl)}">Ver detalle</a></p>`);

  return { subject: `Cancelaste tu turno en ${input.negocio}`, html };
}
