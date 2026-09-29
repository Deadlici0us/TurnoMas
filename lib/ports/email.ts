/**
 * Puerto IEmailProvider (PLAN.md 2.1): Resend en Vercel, fake en memoria
 * para tests y modo demo local.
 */

import { readEnv } from "@/lib/env/env";

export interface EmailAttachment
{
  readonly filename: string;
  readonly contentBase64: string;
}

export interface SendEmailInput
{
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly attachments?: readonly EmailAttachment[];
}

export interface IEmailProvider
{
  send(input: SendEmailInput): Promise<string>;
}

/** Doble de test en memoria: registra envíos sin red. */
export class FakeEmailProvider implements IEmailProvider
{
  readonly sent: SendEmailInput[] = [];
  private counter = 0;

  async send(input: SendEmailInput): Promise<string>
  {
    this.counter += 1;
    this.sent.push(input);

    return `fake-email-${this.counter}`;
  }
}

/** Adaptador Resend vía REST (sin SDK): usa RESEND_API_KEY y EMAIL_FROM. */
export class ResendAdapter implements IEmailProvider
{
  async send(input: SendEmailInput): Promise<string>
  {
    const apiKey = readEnv("RESEND_API_KEY")?.replace(/^["']+|["']+$/g, "").trim() ?? null;
    const from = readEnv("EMAIL_FROM")?.replace(/^["']+|["']+$/g, "").trim() ?? null;

    if (apiKey === null || from === null)
    {
      throw new Error("Falta configurar RESEND_API_KEY o EMAIL_FROM en el entorno.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        attachments: (input.attachments ?? []).map((a) => ({
          filename: a.filename,
          content: a.contentBase64,
        })),
      }),
    });

    if (!response.ok)
    {
      throw new Error(`No se pudo enviar el email de confirmación (HTTP ${response.status}).`);
    }

    const data = (await response.json()) as { id?: string };

    return data.id ?? "resend-sin-id";
  }
}
