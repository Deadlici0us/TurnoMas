/**
 * Plantillas personalizables por negocio (Configuración → Mensajes).
 *
 * Cada tipo admite subject + cuerpo con comodines propios (cliente, negocio,
 * servicio, profesional, fecha y un link específico). El cuerpo admite varias
 * líneas (se convierten en párrafos). Si el dueño no configuró nada o el texto
 * queda vacío, se usa el default compartido de `templates.ts`.
 */

import { escapeHtml, renderEmailParagraph } from "./email-layout";
import
{
  datosPlantilla,
  envolverCuerpo,
  incluyeComodinLink,
  interpolarVariables,
  parrafosVisibles,
  plantillaCancelacion,
  renderizarCuerpoEmail,
  renderizarDefecto,
  textoDefault,
  VARIABLES_PLANTILLA,
  VARIABLES_POR_TIPO,
  type DatosTurno,
  type EmailTemplate,
  type EnlacesPlantilla,
  type TipoPlantilla,
  type TipoPlantillaConfigurable,
  type VarianteConfirmacion,
} from "./templates";

export
{
  datosPlantilla,
  envolverCuerpo,
  incluyeComodinLink,
  interpolarVariables,
  VARIABLES_PLANTILLA,
  VARIABLES_POR_TIPO,
};

export type
{
  DatosTurno,
  EmailTemplate,
  EnlacesPlantilla,
  TipoPlantilla,
  TipoPlantillaConfigurable,
};

export interface PlantillaPersonalizada
{
  readonly subject: unknown;
  readonly cuerpo: unknown;
}

const MAX_SUBJECT = 120;
export const MAX_CUERPO_PLANTILLA = 2000;

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

/** Quita saltos de línea (defensa contra inyección de headers en el asunto). */
function sinSaltos(texto: string): string
{
  return texto.replace(/[\r\n]+/g, " ").trim();
}

/** Opciones para resolver una plantilla. */
export interface OpcionesResolverPlantilla
{
  readonly varianteConfirmacion?: VarianteConfirmacion;
}

/**
 * Resuelve subject + html: personalizada del negocio o default por tipo.
 *
 * @param tipo Tipo de plantilla.
 * @param custom Textos personalizados.
 * @param datos Datos del turno.
 * @param enlaces Links específicos por tipo.
 * @param opciones Variante de confirmación u otras opciones.
 * @return Email listo para enviar.
 */
export function resolverPlantilla(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
  opciones: OpcionesResolverPlantilla = {},
): EmailTemplate
{
  const subject = normalizarTextoPlantilla(custom.subject, MAX_SUBJECT);
  const cuerpo = normalizarTextoPlantilla(custom.cuerpo, MAX_CUERPO_PLANTILLA);

  if (subject === null && cuerpo === null)
  {
    if (tipo === "cancelacion")
    {
      return plantillaCancelacion({
        ...datos,
        cancelacionUrl: enlaces.cancelacion ?? "",
        seDevuelve: true,
        retencionHs: 72,
      });
    }

    return renderizarDefecto(tipo, datos, enlaces, {
      canal: "email",
      variante: opciones.varianteConfirmacion,
    });
  }

  const vars = datosPlantilla(tipo, datos, enlaces);
  const titulo = subject !== null ? sinSaltos(interpolarVariables(subject, vars)) : datos.negocio;
  const detalleDefecto = `${datos.servicio} con ${datos.profesional} · ${datos.fecha}`;
  const contenido = cuerpo !== null
    ? renderizarCuerpoEmail(tipo, cuerpo, vars, enlaces)
    : { html: renderEmailParagraph(escapeHtml(detalleDefecto)), actions: [] };

  return {
    subject: titulo,
    html: envolverCuerpo(titulo, contenido.html, {
      negocio: datos.negocio,
      logoUrl: datos.logoUrl,
      actions: contenido.actions,
      preheader: titulo,
    }),
  };
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
 * Usa el cuerpo personalizado si existe, si no el default del canal.
 */
export function textoWhatsapp(
  tipo: TipoPlantilla,
  custom: PlantillaPersonalizada,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
): string
{
  const cuerpo = normalizarTextoPlantilla(custom.cuerpo, MAX_CUERPO_PLANTILLA);
  const variables = datosPlantilla(tipo, datos, enlaces);

  if (tipo === "resena" && (enlaces.resena ?? "").trim().length === 0
    && (enlaces.opinionPrivada ?? "").trim().length > 0)
  {
    variables.link_resena = enlaces.opinionPrivada as string;
  }

  if (cuerpo !== null)
  {
    return interpolarVariables(cuerpo, variables);
  }

  const defaultWhatsapp = textoDefault(tipo, datos, { canal: "whatsapp" });

  return parrafosVisibles(defaultWhatsapp.cuerpo, variables).join("\n");
}
