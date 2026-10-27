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

import
{
  EMAIL_THEME,
  escapeHtml,
  renderEmailLayout,
  renderEmailParagraph,
  type EmailAction,
  type EmailActionVariant,
} from "./email-layout";

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
  /** Logo público del negocio (se valida y se usa con fallback TurnoMas). */
  readonly logoUrl?: string | null;
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
  const variables: Record<string, string> = {
    cliente: input.cliente,
    negocio: input.negocio,
    servicio: input.servicio,
    profesional: input.profesional,
    fecha: input.fecha,
  };

  return {
    subject: interpolarVariables(definicion.subject, variables),
    cuerpo: interpolarVariables(definicion.cuerpo, variables),
  };
}

/** Opciones adicionales del layout al envolver un cuerpo. */
export interface OpcionesLayoutEmail
{
  readonly negocio?: string;
  readonly logoUrl?: string | null;
  readonly actions?: readonly EmailAction[];
  readonly preheader?: string;
}

/** Cuerpo renderizado con sus acciones separadas del texto. */
export interface CuerpoEmailRenderizado
{
  readonly html: string;
  readonly actions: readonly EmailAction[];
}

const ETIQUETAS_ACCION: Readonly<Record<string, string>> =
{
  link_pago: "Pagar seña",
  link_cancelacion: "Cancelar turno",
  link_resena: "Dejar mi reseña",
  link_reserva: "Reservar de nuevo",
};

/**
 * Resuelve la etiqueta visible del botón para un comodín de link.
 *
 * @param clave Nombre del comodín sin llaves.
 * @param tipo Tipo de plantilla.
 * @return Etiqueta en es-AR.
 */
function etiquetaAccion(clave: string, tipo: TipoPlantilla): string
{
  if (clave === "link")
  {
    if (tipo === "remarketing")
    {
      return "Reservar de nuevo";
    }

    if (tipo === "resena")
    {
      return "Dejar mi reseña";
    }

    return "Cancelar turno";
  }

  return ETIQUETAS_ACCION[clave] ?? "Continuar";
}

/**
 * Define si el botón es principal o secundario según la acción.
 *
 * @param clave Nombre del comodín sin llaves.
 * @param tipo Tipo de plantilla.
 * @return Variante visual.
 */
function varianteAccion(clave: string, tipo: TipoPlantilla): EmailActionVariant
{
  if (clave === "link_cancelacion")
  {
    return "secondary";
  }

  if (clave === "link" && tipo !== "remarketing" && tipo !== "resena")
  {
    return "secondary";
  }

  return "primary";
}

/** Convierte URLs visibles en links sin cambiar el texto que ve el cliente. */
function linkificar(textoEscapado: string): string
{
  return textoEscapado.replace(/(https?:\/\/[^\s<]+)/g, (url) =>
    `<a href="${url}" style="color:${EMAIL_THEME.primary};text-decoration:underline;">${url}</a>`);
}

/**
 * Envuelve el cuerpo en el layout compartido de TurnoMas.
 *
 * @param titulo Título visible del email.
 * @param cuerpoHtml Cuerpo ya renderizado.
 * @param opciones Negocio, logo, acciones y preheader.
 * @return Documento HTML listo para enviar.
 */
export function envolverCuerpo(
  titulo: string,
  cuerpoHtml: string,
  opciones: OpcionesLayoutEmail = {},
): string
{
  return renderEmailLayout({
    title: titulo,
    bodyHtml: cuerpoHtml,
    businessName: opciones.negocio ?? "TurnoMas",
    logoUrl: opciones.logoUrl,
    actions: opciones.actions,
    preheader: opciones.preheader,
  });
}

/**
 * Separa un cuerpo en párrafos visibles, descartando líneas cuyo link no exista.
 *
 * Se conserva para el texto plano de WhatsApp, donde los links no son botones.
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
 * Renderiza un cuerpo con links y convierte los links sueltos en botones.
 *
 * Una línea con un único comodín de link genera el párrafo sin la URL y una
 * acción; así el email no muestra la URL dos veces. Si el link falta, la línea
 * se omite (mismo comportamiento que el texto de WhatsApp).
 *
 * @param tipo Tipo de plantilla.
 * @param texto Cuerpo con comodines.
 * @param variables Mapa de comodines a valores ya resueltos.
 * @param enlaces Links disponibles (para el feedback privado de reseñas).
 * @return HTML de párrafos y acciones.
 */
export function renderizarCuerpoEmail(
  tipo: TipoPlantilla,
  texto: string,
  variables: Record<string, string>,
  enlaces: EnlacesPlantilla = {},
): CuerpoEmailRenderizado
{
  const parrafos: string[] = [];
  const actions: EmailAction[] = [];

  const agregarAccion = (accion: EmailAction): void =>
  {
    if (!actions.some((existente) => existente.href === accion.href && existente.label === accion.label))
    {
      actions.push(accion);
    }
  };

  for (const lineaCruda of texto.split(/\n+/))
  {
    const linea = lineaCruda.trim();

    if (linea.length === 0)
    {
      continue;
    }

    const links = linea.match(/\{link(?:_[a-z]+)?\}/g) ?? [];

    if (links.length > 1)
    {
      const faltante = links.some((marca) => (variables[marca.slice(1, -1)] ?? "").trim().length === 0);

      if (!faltante)
      {
        parrafos.push(linkificar(escapeHtml(interpolarVariables(linea, variables))));
      }

      continue;
    }

    if (links.length === 1)
    {
      const marca = links[0] as string;
      const clave = marca.slice(1, -1);
      const href = (variables[clave] ?? "").trim();

      if (href.length === 0)
      {
        continue;
      }

      const textoPlano = linea.replace(marca, "").replace(/[:\s]+$/g, "").trim();

      if (textoPlano.length > 0)
      {
        parrafos.push(linkificar(escapeHtml(interpolarVariables(textoPlano, variables))));
      }

      agregarAccion({
        href,
        label: etiquetaAccion(clave, tipo),
        variant: varianteAccion(clave, tipo),
      });

      continue;
    }

    let lineaInterpolada = interpolarVariables(linea, variables);
    const opinionPrivada = (enlaces.opinionPrivada ?? "").trim();

    if (tipo === "resena" && opinionPrivada.length > 0 && /\bContanos en privado\b/i.test(lineaInterpolada))
    {
      lineaInterpolada = lineaInterpolada.replace(/\s*Contanos en privado\.?/i, "").trim();
      agregarAccion({
        href: opinionPrivada,
        label: "Contanos en privado",
        variant: "secondary",
      });
    }

    if (lineaInterpolada.length > 0)
    {
      parrafos.push(linkificar(escapeHtml(lineaInterpolada)));
    }
  }

  return {
    html: parrafos.map(renderEmailParagraph).join(""),
    actions,
  };
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
  const cuerpo = renderizarCuerpoEmail(tipo, definicion.cuerpo, variables, enlaces);

  return {
    subject,
    html: envolverCuerpo(subject, cuerpo.html, {
      negocio: datos.negocio,
      logoUrl: datos.logoUrl,
      actions: cuerpo.actions,
      preheader: subject,
    }),
  };
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
  const subject = `Cancelaste tu turno en ${input.negocio}`;
  const destino = input.seDevuelve
    ? "Tu seña vuelve a tu cuenta en los próximos días."
    : `Al cancelar dentro de las ${input.retencionHs}hs previas, la seña queda retenida.`;
  const cuerpoHtml = renderEmailParagraph(
    `Hola ${escapeHtml(input.cliente)}, cancelamos tu <strong>${escapeHtml(input.servicio)}</strong> ` +
    `con ${escapeHtml(input.profesional)} del ${escapeHtml(input.fecha)}.`,
  ) + renderEmailParagraph(escapeHtml(destino));
  const actions: EmailAction[] = input.cancelacionUrl.trim().length > 0
    ? [{ href: input.cancelacionUrl, label: "Ver detalle", variant: "secondary" }]
    : [];
  const html = envolverCuerpo(subject, cuerpoHtml, {
    negocio: input.negocio,
    logoUrl: input.logoUrl,
    actions,
    preheader: subject,
  });

  return { subject, html };
}
