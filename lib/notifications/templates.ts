/**
 * Plantillas de email transaccional en es-AR (Módulo 5).
 *
 * Fuente única de los textos default de email y WhatsApp: lo que ve el dueño
 * como ejemplo grisado en Configuración → Mensajes es exactamente lo que se
 * envía si deja los campos vacíos.
 *
 * Las funciones son puras: reciben datos ya formateados y devuelven subject +
 * html o texto plano. El envío vive en `IEmailProvider`.
 */

/** Tipos de mensaje del producto. */
export type TipoPlantilla = "confirmacion" | "recordatorio" | "resena" | "remarketing" | "cancelacion";

/** Tipos con columnas configurables (cancelación usa el default, sin columnas). */
export type TipoPlantillaConfigurable = Exclude<TipoPlantilla, "cancelacion">;

/** Alias histórico para los tipos que tienen ejemplo grisado. */
export type TipoPlantillaDefault = TipoPlantillaConfigurable;

/** Canal por el que se envía el mensaje. */
export type CanalPlantilla = "email" | "whatsapp";

/** Variante de la confirmación según haya seña o no. */
export type VarianteConfirmacion = "sin_sena" | "con_sena";

export interface EmailTemplate
{
  readonly subject: string;
  readonly html: string;
}

export interface DatosTurno
{
  readonly cliente: string;
  readonly negocio: string;
  readonly servicio: string;
  readonly profesional: string;
  readonly fecha: string;
}

export interface TextoPlantillaDefault
{
  readonly subject: string;
  readonly cuerpo: string;
}

/** Links disponibles al resolver una plantilla. */
export interface EnlacesPlantilla
{
  readonly cancelacion?: string;
  readonly reserva?: string;
  readonly resena?: string;
  /** Link privado de feedback (interno, no se documenta como comodín). */
  readonly opinionPrivada?: string;
  /** Link de pago de la seña (solo confirmación pendiente). */
  readonly pago?: string;
}

/** Comodines comunes a todas las plantillas. */
export const VARIABLES_PLANTILLA = ["cliente", "negocio", "servicio", "profesional", "fecha"] as const;

/** Comodines válidos por tipo (los links son específicos, sin `{link}` genérico). */
export const VARIABLES_POR_TIPO: Readonly<Record<TipoPlantilla, readonly string[]>> =
{
  confirmacion: [...VARIABLES_PLANTILLA, "link_cancelacion", "link_pago"],
  recordatorio: [...VARIABLES_PLANTILLA, "link_cancelacion"],
  resena: ["cliente", "negocio", "servicio", "profesional", "link_resena"],
  remarketing: ["cliente", "negocio", "servicio", "link_reserva"],
  cancelacion: [],
};

/** Reemplaza `{variable}` por su valor (desconocidas se dejan intactas). */
export function interpolarVariables(texto: string, datos: Record<string, string>): string
{
  return texto.replace(/\{([a-zA-Z_]+)\}/g, (marca, clave: string) =>
    Object.hasOwn(datos, clave) ? (datos[clave] as string) : marca);
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
 * los links específicos (`{link_cancelacion}`, `{link_resena}`, etc.).
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
    link_pago: enlaces.pago ?? "",
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

interface DefinicionPlantillaDefault
{
  readonly subject: string;
  readonly cuerpo: string;
}

const DEFAULTS_CONFIRMACION_EMAIL: Readonly<Record<VarianteConfirmacion, DefinicionPlantillaDefault>> =
{
  sin_sena: {
    subject: "Reserva confirmada en {negocio}",
    cuerpo: "Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} en {negocio} " +
      "está confirmada.\nSi no podés venir, cancelá acá: {link_cancelacion}",
  },
  con_sena: {
    subject: "Tu reserva en {negocio} está casi lista",
    cuerpo: "Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} en {negocio} " +
      "está casi lista.\nPagá tu seña acá: {link_pago}\n" +
      "Si no podés venir, cancelá acá: {link_cancelacion}",
  },
};

const DEFAULTS_EMAIL: Readonly<Record<Exclude<TipoPlantilla, "confirmacion">, DefinicionPlantillaDefault>> =
{
  recordatorio: {
    subject: "Recordatorio: tu turno en {negocio} es mañana",
    cuerpo: "Hola {cliente}, te esperamos mañana {fecha} para {servicio} con {profesional} " +
      "en {negocio}.\nSi no podés venir, cancelá tu turno acá: {link_cancelacion}",
  },
  resena: {
    subject: "¿Cómo te fue en {negocio}? Dejanos tu opinión",
    cuerpo: "Hola {cliente}, contanos tu opinión sobre {servicio} con {profesional} en {negocio}.\n" +
      "Escribí tu reseña en Google: {link_resena}\n" +
      "¿Algo para mejorar? Contanos en privado.",
  },
  remarketing: {
    subject: "¿Renovamos tu {servicio}?",
    cuerpo: "Hola {cliente}, pasó un tiempo desde tu última visita a {negocio}. " +
      "Te invitamos a renovar tu {servicio}.\nReservar de nuevo: {link_reserva}",
  },
  cancelacion: {
    subject: "Cancelaste tu turno en {negocio}",
    cuerpo: "Hola {cliente}, cancelamos tu {servicio} con {profesional} del {fecha}.",
  },
};

const DEFAULTS_WHATSAPP: Readonly<Record<TipoPlantilla, DefinicionPlantillaDefault>> =
{
  confirmacion: {
    subject: "",
    cuerpo: "Hola {cliente}, tu reserva de {servicio} con {profesional} para el {fecha} " +
      "en {negocio} está confirmada.",
  },
  recordatorio: {
    subject: "",
    cuerpo: "Hola {cliente}, te esperamos {fecha} para {servicio} con {profesional} en {negocio}.\n" +
      "Si no podés venir, cancelá acá: {link_cancelacion}",
  },
  resena: {
    subject: "",
    cuerpo: "Hola {cliente}, contanos tu opinión sobre {servicio} en {negocio}: {link_resena}",
  },
  remarketing: {
    subject: "",
    cuerpo: "Hola {cliente}, pasó un tiempo desde tu última visita a {negocio}. " +
      "¿Renovamos tu {servicio}? {link_reserva}",
  },
  cancelacion: {
    subject: "",
    cuerpo: "Hola {cliente}, si no podés venir a {negocio} el {fecha}, " +
      "cancelá acá tu {servicio}: {link_cancelacion}",
  },
};

/** Opciones para elegir el default correcto. */
export interface OpcionesTextoDefault
{
  readonly canal?: CanalPlantilla;
  readonly variante?: VarianteConfirmacion;
}

function definicionDefecto(
  tipo: TipoPlantilla,
  canal: CanalPlantilla,
  variante: VarianteConfirmacion = "sin_sena",
): DefinicionPlantillaDefault
{
  if (canal === "whatsapp")
  {
    return DEFAULTS_WHATSAPP[tipo];
  }

  if (tipo === "confirmacion")
  {
    return DEFAULTS_CONFIRMACION_EMAIL[variante];
  }

  return DEFAULTS_EMAIL[tipo];
}

/**
 * Texto visible de la plantilla default, con comodines sin interpolar.
 *
 * Es la fuente única para los ejemplos grisados de `Tus mensajes`: lo que ve
 * el dueño es exactamente lo que se envía si deja los campos vacíos.
 *
 * @param tipo Tipo de mensaje.
 * @param input Datos del turno (usar comodines como valores para el ejemplo).
 * @param opciones Canal y variante de confirmación.
 * @return Asunto y cuerpo default.
 */
export function textoDefault(
  tipo: TipoPlantilla,
  input: DatosTurno,
  opciones: OpcionesTextoDefault = {},
): TextoPlantillaDefault
{
  const definicion = definicionDefecto(tipo, opciones.canal ?? "email", opciones.variante);
  const variables: Record<string, string> = { ...input };

  return {
    subject: interpolarVariables(definicion.subject, variables),
    cuerpo: interpolarVariables(definicion.cuerpo, variables),
  };
}

function escapeHtml(valor: string): string
{
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convierte URLs visibles en links sin cambiar el texto que ve el cliente. */
function linkificar(textoEscapado: string): string
{
  return textoEscapado.replace(/(https?:\/\/[^\s<]+)/g, (url) =>
    `<a href="${url.replace(/"/g, "&quot;")}">${url}</a>`);
}

/** Envuelve el cuerpo en el layout clásico de TurnoMas. */
export function envolverCuerpo(titulo: string, cuerpoHtml: string): string
{
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">` +
    `<h2>${escapeHtml(titulo)}</h2>${cuerpoHtml}` +
    `<p style="color:#64748b;font-size:12px">Enviado por TurnoMas</p></div>`;
}

/**
 * Separa un cuerpo en párrafos visibles, descartando líneas cuyo link no exista.
 *
 * @param texto Cuerpo con comodines.
 * @param variables Mapa de comodines a valores ya resueltos.
 * @return Líneas interpoladas y listas para renderizar.
 */
export function parrafosVisibles(texto: string, variables: Record<string, string>): string[]
{
  return texto.split(/\n+/).map((linea) => linea.trim()).filter((linea) => linea.length > 0)
    .filter((linea) =>
    {
      const links = linea.match(/\{link(?:_[a-z]+)?\}/g) ?? [];

      return links.every((marca) =>
      {
        const clave = marca.slice(1, -1);

        return (variables[clave] ?? "").trim().length > 0;
      });
    })
    .map((linea) => interpolarVariables(linea, variables));
}

/**
 * Renderiza el default de email de un tipo, canal y variante.
 *
 * @param tipo Tipo de mensaje (sin cancelación, que tiene texto dinámico).
 * @param datos Datos del turno.
 * @param enlaces Links disponibles.
 * @param opciones Canal y variante de confirmación.
 * @return Email listo para enviar.
 */
export function renderizarDefecto(
  tipo: Exclude<TipoPlantilla, "cancelacion">,
  datos: DatosTurno,
  enlaces: EnlacesPlantilla = {},
  opciones: OpcionesTextoDefault = {},
): EmailTemplate
{
  const definicion = definicionDefecto(tipo, opciones.canal ?? "email", opciones.variante);
  const variables = datosPlantilla(tipo, datos, enlaces);
  const subject = interpolarVariables(definicion.subject, variables);
  const parrafos = parrafosVisibles(definicion.cuerpo, variables);
  let cuerpoHtml = parrafos.map((parrafo) => `<p>${linkificar(escapeHtml(parrafo))}</p>`).join("");

  if (tipo === "resena" && (enlaces.opinionPrivada ?? "").trim().length > 0)
  {
    const href = escapeHtml(enlaces.opinionPrivada as string).replace(/"/g, "&quot;");
    cuerpoHtml = cuerpoHtml.replace("Contanos en privado", `<a href="${href}">Contanos en privado</a>`);
  }

  return { subject, html: envolverCuerpo(subject, cuerpoHtml) };
}

/** Confirmación de reserva sin seña. */
export function plantillaConfirmacion(input: DatosTurno): EmailTemplate
{
  return renderizarDefecto("confirmacion", input, {}, { variante: "sin_sena" });
}

/** Recordatorio previo al turno (con link de cancelación si está disponible). */
export function plantillaRecordatorio(input: DatosTurno & { cancelacionUrl?: string }): EmailTemplate
{
  return renderizarDefecto("recordatorio", input, { cancelacion: input.cancelacionUrl ?? "" });
}

/** Boomerang: invita a renovar el servicio X días después. */
export function plantillaRemarketing(input: DatosTurno & { portalUrl: string }): EmailTemplate
{
  return renderizarDefecto("remarketing", input, { reserva: input.portalUrl });
}

/** Recolector de reseñas 2h post-turno (Google para todos + feedback privado). */
export function plantillaResena(
  input: DatosTurno & { readonly googleReviewUrl: string; readonly feedbackUrl: string },
): EmailTemplate
{
  return renderizarDefecto("resena", input, {
    resena: input.googleReviewUrl,
    opinionPrivada: input.feedbackUrl,
  });
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
  const html = envolverCuerpo(`Cancelaste tu turno en ${input.negocio}`,
    `<p>Hola ${escapeHtml(input.cliente)}, cancelamos tu <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} del ${escapeHtml(input.fecha)}.</p>` +
    `<p>${escapeHtml(destino)}</p>` +
    `<p><a href="${escapeHtml(input.cancelacionUrl)}">Ver detalle</a></p>`);

  return { subject: `Cancelaste tu turno en ${input.negocio}`, html };
}
