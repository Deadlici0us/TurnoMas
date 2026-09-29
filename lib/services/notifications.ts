import { ResendAdapter } from "@/lib/ports/email";
import { QStashAdapter } from "@/lib/ports/jobs";
import { readEnv } from "@/lib/env/env";

export enum NotificationType
{
  REMINDER_24H = "reminder_24h",
  REMINDER_1H = "reminder_1h",
  PAYMENT_CONFIRMED = "payment_confirmed",
  PAYMENT_FAILED = "payment_failed",
  BOOKING_COMPLETED = "booking_completed",
  ABANDONMENT = "abandonment",
  RECOVERY = "recovery",
  WELCOME = "welcome",
  SUBJECT = "subject",
}

/** Base pública de la app para que QStash pueda invocar nuestros endpoints. */
function resolveAppBaseUrl(): string
{
  const publicUrl = readEnv("NEXT_PUBLIC_APP_URL");

  if (publicUrl !== null)
  {
    return publicUrl.replace(/\/+$/, "");
  }

  const vercelUrl = readEnv("VERCEL_URL");

  if (vercelUrl !== null)
  {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  throw new Error("Falta configurar NEXT_PUBLIC_APP_URL o VERCEL_URL para programar recordatorios.");
}

/**
 * Resuelve el nombre visible del remitente desde el payload del turno.
 *
 * @param data Payload con el nombre del negocio bajo claves conocidas.
 * @return Nombre del negocio o undefined para usar el default.
 */
function resolveFromName(data: Record<string, unknown>): string | undefined
{
  for (const key of ["negocio", "negocioNombre", "businessName", "fromName"])
  {
    const value = data[key];

    if (typeof value === "string" && value.trim().length > 0)
    {
      return value;
    }
  }

  return undefined;
}

export class NotificationService
{
  private emailProvider: ResendAdapter;
  private jobProvider: QStashAdapter;

  constructor()
  {
    this.emailProvider = new ResendAdapter();
    this.jobProvider = new QStashAdapter();
  }

  /** Programa recordatorios vía QStash (24h, 1h) y emails vía Resend. */
  async scheduleReminder(
    bookingId: string,
    type: NotificationType,
    data: Record<string, unknown>,
  ): Promise<{ emailId?: string; jobId?: string }>
  {
    // 1. Email inmediato de confirmación si aplica
    let emailId: string | undefined;
    if (type === NotificationType.PAYMENT_CONFIRMED || type === NotificationType.WELCOME)
    {
      emailId = await this.emailProvider.send({
        to: data.email as string || "demo@turnomas.com",
        subject: data.subject as string || "TurnoMas - Reserva confirmada",
        fromName: resolveFromName(data),
        html: data.html as string || `<p>${data.message || "Tu reserva está confirmada"}</p>`,
      });
    }

    // 2. Recordatorio programado vía QStash (24h antes del turno)
    let jobId: string | undefined;
    if (type === NotificationType.REMINDER_24H || type === NotificationType.REMINDER_1H)
    {
      const delaySeconds = type === NotificationType.REMINDER_24H ? 86400 : 3600;
      jobId = await this.jobProvider.schedule({
        url: `${resolveAppBaseUrl()}/dashboard/reminders`,
        delaySeconds,
        body: { type, bookingId, data },
      });
    }

    return { emailId, jobId };
  }

  /** Envía email de abandono de inasistencia. */
  async sendAbandonmentEmail(bookingId: string, data: Record<string, unknown>): Promise<string>
  {
    return this.emailProvider.send({
      to: data.email as string || "demo@turnomas.com",
      subject: data.subject as string || "TurnoMas - Recordatorio de pago",
      fromName: resolveFromName(data),
      html: data.html as string || `<p>${data.message || "Tu turno está pendiente de pago"}</p>`,
    });
  }

  /** Envía email de recuperación post-turno. */
  async sendRecoveryEmail(bookingId: string, data: Record<string, unknown>): Promise<string>
  {
    return this.emailProvider.send({
      to: data.email as string || "demo@turnomas.com",
      subject: data.subject as string || "TurnoMas - Reseña de tu experiencia",
      fromName: resolveFromName(data),
      html: data.html as string || `<p>${data.message || "¿Cómo fue tu experiencia?"}</p>`,
    });
  }
}

export const notificationService = new NotificationService();