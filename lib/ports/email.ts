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
  readonly fromName?: string;
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

/** Nombre visible por defecto cuando el negocio no aporta uno. */
export const DEFAULT_FROM_NAME = "TurnoMas";

/**
 * Extrae la casilla de EMAIL_FROM, aceptando formato simple o legacy "Nombre <casilla>".
 *
 * @param raw Valor crudo de EMAIL_FROM ya recortado.
 * @return Solo la dirección de email.
 */
export function extractEmailAddress(raw: string): string
{
  const match = /<([^<>]+)>/.exec(raw);

  if (match?.[1])
  {
    return match[1].trim();
  }

  return raw.trim();
}

/**
 * Sanea el nombre visible del remitente contra inyección de cabeceras.
 *
 * @param raw Nombre del negocio tal cual lo cargó el cliente.
 * @return Nombre limpio o null si queda vacío.
 */
export function sanitizeDisplayName(raw: string): string | null
{
  const clean = raw.replace(/[\r\n"]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

  return clean.length > 0 ? clean : null;
}

/**
 * Arma la cabecera From de Resend como "Nombre <casilla>".
 *
 * @param address Casilla verificada en Resend.
 * @param name Nombre del negocio o undefined para el default.
 * @return Cabecera lista para la API de Resend.
 */
export function buildFromHeader(address: string, name?: string): string
{
  const display = (name !== undefined ? sanitizeDisplayName(name) : null) ?? DEFAULT_FROM_NAME;

  return `${display} <${address}>`;
}

/**
 * Quita comillas simples/dobles de los bordes.
 * S8786: bucle lineal en vez de /^["']+|["']+$/ con alternancia super-lineal.
 *
 * @param valor Valor crudo del entorno.
 * @return Valor sin comillas envolventes.
 */
function desentrecomillar(valor: string): string
{
  let inicio = 0;
  let fin = valor.length;

  while (inicio < fin && (valor[inicio] === '"' || valor[inicio] === "'"))
  {
    inicio += 1;
  }

  while (fin > inicio && (valor[fin - 1] === '"' || valor[fin - 1] === "'"))
  {
    fin -= 1;
  }

  return valor.slice(inicio, fin);
}

/** Adaptador Resend vía REST (sin SDK): usa RESEND_API_KEY y EMAIL_FROM. */
export class ResendAdapter implements IEmailProvider
{
  async send(input: SendEmailInput): Promise<string>
  {
    const apiKeyCrudo = readEnv("RESEND_API_KEY");
    const fromCrudo = readEnv("EMAIL_FROM");
    const apiKey = apiKeyCrudo !== null ? desentrecomillar(apiKeyCrudo).trim() : null;
    const fromRaw = fromCrudo !== null ? desentrecomillar(fromCrudo).trim() : null;

    if (apiKey === null || fromRaw === null)
    {
      throw new Error("Falta configurar RESEND_API_KEY o EMAIL_FROM en el entorno.");
    }

    const from = buildFromHeader(extractEmailAddress(fromRaw), input.fromName);

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
