/**
 * Layout compartido de emails transaccionales de TurnoMas.
 *
 * Replica la estructura del email de referencia (tarjeta de 600px, banda
 * superior con logo circular, contenido centrado y footer oscuro) con la
 * paleta de marca del producto. Todo el CSS va inline para sobrevivir a los
 * clientes de correo; la media query solo ajusta el ancho en mobile.
 */

import { sanitizeUrlExterna } from "@/lib/validation/url";

/** Logo de marca usado cuando el negocio no tiene uno válido. */
export const EMAIL_FALLBACK_LOGO_URL = "https://turnomas.com/brand/logo-512.png";

/** URL pública usada por los links legales del footer. */
export const EMAIL_APP_URL = "https://turnomas.com";

/** Tokens visuales del email. */
export const EMAIL_THEME =
{
  background: "#f1f6ff",
  card: "#ffffff",
  header: "#06adef",
  heading: "#0b3052",
  body: "#253246",
  muted: "#788291",
  primary: "#06adef",
  cta: "#ff3259",
  footer: "#0b3052",
  border: "#e7ecf7",
  maxWidth: "600px",
  fontFamily: "Arial, Helvetica, sans-serif",
} as const;

/** Estilo inline de los párrafos del cuerpo. */
export const EMAIL_PARAGRAPH_STYLE = "margin:0 0 14px;font-family:Arial, Helvetica, sans-serif;" +
  "font-size:15px;line-height:1.6;color:#253246;text-align:center;";

/** Variante visual de un botón de acción. */
export type EmailActionVariant = "primary" | "secondary";

/** Acción principal o secundaria de un email. */
export interface EmailAction
{
  readonly href: string;
  readonly label: string;
  readonly variant?: EmailActionVariant;
}

/** Datos necesarios para envolver un cuerpo en el layout de marca. */
export interface EmailLayoutInput
{
  readonly title: string;
  readonly bodyHtml: string;
  readonly businessName: string;
  readonly logoUrl?: string | null;
  readonly preheader?: string;
  readonly actions?: readonly EmailAction[];
}

/**
 * Escapa texto para insertarlo como contenido o atributo HTML.
 *
 * @param valor Texto crudo.
 * @return Texto seguro para HTML.
 */
export function escapeHtml(valor: string): string
{
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Resuelve el logo del negocio, cayendo al de TurnoMas si no es http(s).
 *
 * @param valor URL cruda del logo.
 * @return URL segura para el atributo src.
 */
export function resolveEmailLogoUrl(valor: unknown): string
{
  return sanitizeUrlExterna(valor) ?? EMAIL_FALLBACK_LOGO_URL;
}

/**
 * Envuelve un fragmento HTML en un párrafo con el estilo del layout.
 *
 * @param html Contenido ya escapado y, si aplica, con links.
 * @return Párrafo listo para insertar.
 */
export function renderEmailParagraph(html: string): string
{
  return `<p style="${EMAIL_PARAGRAPH_STYLE}">${html}</p>`;
}

/**
 * Renderiza un botón de acción compatible con clientes de correo.
 *
 * @param action Texto, URL y variante.
 * @return Anchor con estilos inline.
 */
export function renderEmailButton(action: EmailAction): string
{
  const esSecundario = action.variant === "secondary";
  const fondo = esSecundario ? EMAIL_THEME.card : EMAIL_THEME.cta;
  const color = esSecundario ? EMAIL_THEME.primary : "#ffffff";
  const borde = esSecundario ? `1px solid ${EMAIL_THEME.primary}` : `1px solid ${EMAIL_THEME.cta}`;

  return `<a href="${escapeHtml(action.href)}" target="_blank" rel="noopener" ` +
    `style="display:inline-block;margin:4px 4px 0;padding:12px 26px;border-radius:8px;` +
    `background-color:${fondo};border:${borde};color:${color};font-family:Arial, Helvetica, sans-serif;` +
    `font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;">${escapeHtml(action.label)}</a>`;
}

/**
 * Arma el documento HTML completo de un email transaccional.
 *
 * @param input Título, cuerpo, negocio, logo y acciones.
 * @return Documento HTML listo para Resend.
 */
export function renderEmailLayout(input: EmailLayoutInput): string
{
  const logo = resolveEmailLogoUrl(input.logoUrl);
  const negocio = escapeHtml(input.businessName.trim().length > 0 ? input.businessName : "TurnoMas");
  const titulo = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader ?? input.title);
  const acciones = (input.actions ?? [])
    .filter((accion) => accion.href.trim().length > 0)
    .map(renderEmailButton)
    .join("");
  const bloqueAcciones = acciones.length > 0
    ? `<div style="padding-top:8px;text-align:center;">${acciones}</div>`
    : "";

  return [
    "<!DOCTYPE html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="color-scheme" content="light">',
    `<title>${titulo}</title>`,
    "<style>",
    "@media only screen and (max-width:600px){",
    ".tm-card{width:100%!important;border-radius:16px!important}",
    ".tm-header{height:108px!important}",
    ".tm-px{padding-left:22px!important;padding-right:22px!important}",
    "}",
    "</style>",
    "</head>",
    `<body style="margin:0;padding:0;background-color:${EMAIL_THEME.background};` +
      `font-family:${EMAIL_THEME.fontFamily};">`,
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;` +
      `line-height:1px;color:${EMAIL_THEME.background};opacity:0;">${preheader}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
      `style="background-color:${EMAIL_THEME.background};padding:24px 12px;">`,
    "<tr>",
    '<td align="center">',
    `<table role="presentation" class="tm-card" width="600" cellpadding="0" cellspacing="0" border="0" ` +
      `style="width:100%;max-width:${EMAIL_THEME.maxWidth};border-radius:20px;overflow:hidden;` +
      `background-color:${EMAIL_THEME.card};">`,
    "<tr>",
    `<td class="tm-header" align="center" style="height:120px;background-color:${EMAIL_THEME.header};` +
      'padding:0;">',
    '<div style="width:76px;height:76px;margin:38px auto 0;border:2px solid #ffffff;' +
      'border-radius:50%;background-color:#ffffff;overflow:hidden;">',
    `<img src="${escapeHtml(logo)}" alt="${negocio}" width="72" height="72" ` +
      'style="display:block;width:72px;height:72px;border:0;border-radius:50%;object-fit:cover;">',
    "</div>",
    "</td>",
    "</tr>",
    "<tr>",
    `<td class="tm-px" style="padding:32px 36px 36px;background-color:${EMAIL_THEME.card};">`,
    `<h1 style="margin:0 0 20px;font-family:${EMAIL_THEME.fontFamily};font-size:21px;` +
      `line-height:1.3;font-weight:700;color:${EMAIL_THEME.heading};text-align:center;">${titulo}</h1>`,
    input.bodyHtml,
    bloqueAcciones,
    "</td>",
    "</tr>",
    "<tr>",
    `<td class="tm-px" style="background-color:${EMAIL_THEME.footer};padding:26px 36px 24px;` +
      'text-align:center;">',
    `<img src="${EMAIL_FALLBACK_LOGO_URL}" alt="TurnoMas" width="28" height="28" ` +
      'style="display:block;width:28px;height:28px;margin:0 auto 10px;border:0;border-radius:8px;">',
    `<p style="margin:0;font-family:${EMAIL_THEME.fontFamily};font-size:15px;line-height:1.4;` +
      `font-weight:700;color:#ffffff;">${negocio}</p>`,
    `<p style="margin:6px 0 0;font-family:${EMAIL_THEME.fontFamily};font-size:12px;` +
      'line-height:1.5;color:#c9d8e6;">Enviado por TurnoMas</p>',
    `<p style="margin:14px 0 0;font-family:${EMAIL_THEME.fontFamily};font-size:12px;line-height:1.5;">`,
    `<a href="${EMAIL_APP_URL}/privacidad" style="color:#c9d8e6;text-decoration:underline;">Privacidad</a>`,
    '<span style="color:#5f7890;"> · </span>',
    `<a href="${EMAIL_APP_URL}/terminos" style="color:#c9d8e6;text-decoration:underline;">Términos</a>`,
    "</p>",
    "</td>",
    "</tr>",
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}
