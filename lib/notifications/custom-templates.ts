/**
 * Plantillas personalizables por negocio (Configuración → Mensajes).
 *
 * Cada tipo admite subject + cuerpo con comodines propios (cliente, negocio,
 * servicio, profesional, fecha y un link específico). El cuerpo admite varias
 * líneas (se convierten en párrafos). Si el dueño no configuró nada o el texto
 * queda vacío, se usa el default de `templates.ts`.
 */

import
{
  plantillaCancelacion,
  plantillaConfirmacion,
  plantillaRecordatorio,
  plantillaRemarketing,
  plantillaResena,
  type DatosTurno,
  type EmailTemplate,
} from "./templates";

export type TipoPlantilla = "confirmacion" | "recordatorio" | "resena" | "remarketing" | "cancelacion";

/** Tipos con columnas configurables (cancelación usa el default, sin columnas). */
export type TipoPlantillaConfigurable = Exclude<TipoPlantilla, "cancelacion">;

export interface PlantillaPersonalizada
{
  readonly subject: unknown;
  readonly cuerpo: unknown;
}

/** Comodines comunes a todas las plantillas. */
export const VARIABLES_PLANTILLA = ["cliente", "negocio", "servicio", "profesional", "fecha"] as const;

/** Comodines válidos por tipo (los links son específicos, sin `{link}` genérico). */
export const VARIABLES_POR_TIPO: Readonly<Record<TipoPlantilla, readonly string[]>> =
{
  confirmacion: [...VARIABLES_PLANTILLA, "link_cancelacion"],
  recordatorio: [...VARIABLES_PLANTILLA, "link_cancelacion"],
  resena: ["cliente", "negocio", "servicio", "profesional", "link_resena"],
  remarketing: ["cliente", "negocio", "servicio", "link_reserva"],
  cancelacion: [],
};

/** Links disponibles al resolver una plantilla. */
export interface EnlacesPlantilla
{
  readonly cancelacion?: string;
  readonly reserva?: string;
  readonly resena?: string;
  /** Link privado de feedback (interno, no se documenta como comodín). */
  readonly opinionPrivada?: string;
}

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
  return texto.replace(/\{([a-zA-Z_]+)\}/g, (marca, clave: string) =>
    Object.hasOwn(datos, clave) ? (datos[clave] as string) : marca);
}

/** Quita saltos de línea (defensa contra inyección de headers en el asunto). */
function sinSaltos(texto: string): string
{
  return texto.replace(/[\r\n]+/g, " ").trim();
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

/** Link que representa al `{link}` legacy según el tipo de plantilla. */
function linkLegacy(tipo: TipoPlantilla, enlaces: EnlacesPlantilla): string
{
  if (tipo === "remarketing")
  {
    return enlaces.reserva ?? "";
  }

  if (tipo === "resena")
  {
    return enlaces.resena ?? enlaces.opinionPrivada ?? "";
  }

  return enlaces.cancelacion ?? "";
}

/**
 * Variables disponibles para interpolar una plantilla.
 *
 * Incluye `{link}` como alias de compatibilidad, pero la UI solo documenta
 * los links específicos (`{link_cancelacion}`, `{link_resena}`, `{link_reserva}`).
 *
 * @param tipo Tipo de plantilla.
 * @param datos Datos del turno.
 * @param enlaces Links disponibles.
 * @return Mapa de comodines a valores.
 */
export function datosPlantilla(
  tipo: TipoPlantilla,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
): Record<string, string>
{
  return {
    cliente: datos.cliente,
    negocio: datos.negocio,
    servicio: datos.servicio,
    profesional: datos.profesional,
    fecha: datos.fecha,
    link: linkLegacy(tipo, enlaces),
    link_cancelacion: enlaces.cancelacion ?? "",
    link_reserva: enlaces.reserva ?? "",
    link_resena: enlaces.resena ?? "",
  };
}

/**
 * Indica si un texto personalizado ya incluye un comodín de link.
 *
 * @param cuerpo Cuerpo personalizado.
 * @param comodin Nombre específico (ej: `link_cancelacion`).
 * @return Verdadero cuando usa el comodín específico o el alias `{link}`.
 */
export function incluyeComodinLink(cuerpo: string, comodin: string): boolean
{
  return cuerpo.includes(`{${comodin}}`) || cuerpo.includes("{link}");
}

/**
 * Resuelve subject + html: personalizada del negocio o default por tipo.
 *
 * @param tipo Tipo de plantilla.
 * @param custom Textos personalizados.
 * @param datos Datos del turno.
 * @param enlaces Links específicos por tipo.
 * @return Email listo para enviar.
 */
export function resolverPlantilla(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
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
      return plantillaRecordatorio({ ...datos, cancelacionUrl: enlaces.cancelacion ?? "" });
    }

    if (tipo === "resena")
    {
      return plantillaResena({
        ...datos,
        googleReviewUrl: enlaces.resena ?? "",
        feedbackUrl: enlaces.opinionPrivada ?? "",
      });
    }

    if (tipo === "cancelacion")
    {
      return plantillaCancelacion({
        ...datos,
        cancelacionUrl: enlaces.cancelacion ?? "",
        seDevuelve: true,
        retencionHs: 72,
      });
    }

    return plantillaRemarketing({ ...datos, portalUrl: enlaces.reserva ?? "" });
  }

  const vars = datosPlantilla(tipo, datos, enlaces);
  const titulo = subject !== null ? sinSaltos(interpolarVariables(subject, vars)) : datos.negocio;
  const parrafos = cuerpo !== null
    ? interpolarVariables(cuerpo, vars).split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 0)
    : [];
  const detalleDefecto = `${datos.servicio} con ${datos.profesional} · ${datos.fecha}`;
  const cuerpoHtml = parrafos.length > 0
    ? parrafos.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
    : `<p>${escapeHtml(detalleDefecto)}</p>`;

  return { subject: titulo, html: envolverCuerpo(titulo, cuerpoHtml) };
}

/** Valida la URL de Google Maps del negocio (vacia = sin configurar). */
export function validarGoogleMapsUrl(valor: unknown): string | null
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

/** Valida el place ID de Google del negocio (vacio = sin configurar). */
export function validarGooglePlaceId(valor: unknown): string | null
{
  if (valor === null || valor === undefined)
  {
    return null;
  }

  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return null;
  }

  const id = valor.trim().slice(0, 200);

  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id))
  {
    throw new RangeError("Pegá un place ID válido de Google (ej: ChIJ...).");
  }

  return id;
}

/**
 * Texto plano para refuerzo manual por WhatsApp (link wa.me).
 * Usa el cuerpo personalizado si existe, si no el default del tipo.
 */
export function textoWhatsapp(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
): string
{
  const cuerpo = normalizarTextoPlantilla(custom.cuerpo, MAX_CUERPO);

  if (cuerpo !== null)
  {
    return interpolarVariables(cuerpo, datosPlantilla(tipo, datos, enlaces));
  }

  if (tipo === "recordatorio")
  {
    const cancelar = (enlaces.cancelacion ?? "").length > 0
      ? `\nSi no podés venir, cancelá acá: ${enlaces.cancelacion}`
      : "";

    return `Hola ${datos.cliente}, te esperamos ${datos.fecha} para ${datos.servicio} ` +
      `con ${datos.profesional} en ${datos.negocio}.${cancelar}`;
  }

  if (tipo === "resena")
  {
    const link = enlaces.resena ?? enlaces.opinionPrivada ?? "";

    return `Hola ${datos.cliente}, contanos tu opinión sobre ${datos.servicio} ` +
      `en ${datos.negocio}: ${link}`;
  }

  if (tipo === "remarketing")
  {
    return `Hola ${datos.cliente}, pasó un tiempo desde tu última visita a ${datos.negocio}. ` +
      `¿Renovamos tu ${datos.servicio}? ${enlaces.reserva ?? ""}`;
  }

  if (tipo === "cancelacion")
  {
    return `Hola ${datos.cliente}, si no podés venir a ${datos.negocio} el ${datos.fecha}, ` +
      `cancelá acá tu ${datos.servicio}: ${enlaces.cancelacion ?? ""}`;
  }

  return `Hola ${datos.cliente}, tu reserva de ${datos.servicio} con ${datos.profesional} ` +
    `para el ${datos.fecha} en ${datos.negocio} está confirmada.`;
}
