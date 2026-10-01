/**
 * Plantillas personalizables por negocio (Configuración → Mensajes).
 *
 * Cada tipo admite subject + cuerpo con variables `{negocio} {servicio}
 * {profesional} {fecha} {link}`. El cuerpo admite varias líneas (se
 * convierten en párrafos). Si el dueño no configuró nada o el texto queda
 * vacío, se usa el default de `templates.ts`.
 */

import
{
  plantillaConfirmacion,
  plantillaRecordatorio,
  plantillaRemarketing,
  plantillaResena,
  type DatosTurno,
  type EmailTemplate,
} from "./templates";

export type TipoPlantilla = "confirmacion" | "recordatorio" | "resena" | "remarketing";

export interface PlantillaPersonalizada
{
  readonly subject: unknown;
  readonly cuerpo: unknown;
}

export const VARIABLES_PLANTILLA = ["negocio", "servicio", "profesional", "fecha", "link"] as const;

const MAX_SUBJECT = 120;
const MAX_CUERPO = 2000;

/** Normaliza el texto del dueño (null cuando vacío para usar el default). */
export function normalizarTextoPlantilla(valor: unknown, maximo: number): string | null
{
  if (typeof valor !== "string")
  {
    return null;
  }

  const texto = valor.trim().slice(0, maximo);

  return texto.length > 0 ? texto : null;
}

/** Reemplaza `{variable}` por su valor (desconocidas se dejan intactas). */
export function interpolarVariables(texto: string, datos: Record<string, string>): string
{
  return texto.replace(/\{([a-zA-Z]+)\}/g, (marca, clave: string) =>
    Object.hasOwn(datos, clave) ? (datos[clave] as string) : marca);
}

function escapeHtml(valor: string): string
{
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Envuelve el cuerpo en el layout clásico de TurnoMas. */
export function envolverCuerpo(titulo: string, cuerpoHtml: string): string
{
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">` +
    `<h2>${escapeHtml(titulo)}</h2>${cuerpoHtml}` +
    `<p style="color:#64748b;font-size:12px">Enviado por TurnoMas</p></div>`;
}

/** Datos con `link` para interpolar según el tipo de plantilla. */
export function datosConLink(
  tipo: TipoPlantilla,
  datos: DatosTurno,
  link: string,
): Record<string, string>
{
  void tipo;

  return {
    negocio: datos.negocio,
    servicio: datos.servicio,
    profesional: datos.profesional,
    fecha: datos.fecha,
    link,
  };
}

/**
 * Resuelve subject + html: personalizada del negocio o default por tipo.
 * `link` es portalUrl (remarketing), resenaUrl (reseña) o "" (resto).
 */
export function resolverPlantilla(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  link: string = "",
): EmailTemplate
{
  const subject = normalizarTextoPlantilla(custom.subject, MAX_SUBJECT);
  const cuerpo = normalizarTextoPlantilla(custom.cuerpo, MAX_CUERPO);

  if (subject === null && cuerpo === null)
  {
    if (tipo === "confirmacion")
    {
      return plantillaConfirmacion(datos);
    }

    if (tipo === "recordatorio")
    {
      return plantillaRecordatorio(datos);
    }

    if (tipo === "resena")
    {
      return plantillaResena({ ...datos, resenaUrl: link });
    }

    return plantillaRemarketing({ ...datos, portalUrl: link });
  }

  const vars = datosConLink(tipo, datos, link);
  const titulo = subject !== null ? interpolarVariables(subject, vars) : datos.negocio;
  const parrafos = cuerpo !== null
    ? interpolarVariables(cuerpo, vars).split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
    : [];
  const cuerpoHtml = parrafos.length > 0
    ? parrafos.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
    : `<p>${escapeHtml(`${datos.servicio} con ${datos.profesional} · ${datos.fecha}`)}</p>`;

  return { subject: titulo, html: envolverCuerpo(titulo, cuerpoHtml) };
}

/** Valida la URL de Google Maps del negocio (vacia = sin configurar). */export function validarGoogleMapsUrl(valor: unknown): string | null
{
  if (valor === null || valor === undefined)
  {
    return null;
  }

  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return null;
  }

  const url = valor.trim().slice(0, 500);

  if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(url) && !/^https:\/\/goo\.gl\/maps/i.test(url)
    && !/^https:\/\/maps\.app\.goo\.gl\//i.test(url))
  {
    throw new RangeError("Pegá un link válido de Google Maps (google.com/maps o maps.app.goo.gl).");
  }

  return url;
}

/**
 * Texto plano para refuerzo manual por WhatsApp (link wa.me).
 * Usa el cuerpo personalizado si existe, si no el default del tipo.
 */
export function textoWhatsapp(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  link: string = "",
): string
{
  const cuerpo = normalizarTextoPlantilla(custom.cuerpo, MAX_CUERPO);

  if (cuerpo !== null)
  {
    return interpolarVariables(cuerpo, datosConLink(tipo, datos, link));
  }

  if (tipo === "recordatorio")
  {
    return `Hola, te esperamos ${datos.fecha} para ${datos.servicio} con ${datos.profesional} en ${datos.negocio}.`;
  }

  if (tipo === "resena")
  {
    return `Hola, contanos tu opinión sobre ${datos.servicio} en ${datos.negocio}: ${link}`;
  }

  if (tipo === "remarketing")
  {
    return `Hola, pasó un tiempo desde tu última visita a ${datos.negocio}. ¿Renovamos tu ${datos.servicio}? ${link}`;
  }

  return `Hola, tu reserva de ${datos.servicio} con ${datos.profesional} para el ${datos.fecha} en ${datos.negocio} está confirmada.`;
}
