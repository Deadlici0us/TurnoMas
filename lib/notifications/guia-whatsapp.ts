/**
 * Guía de WhatsApp app-only: textos listos para pegar en la app.
 *
 * Sin Meta API el dueño responde con su propia app de WhatsApp; acá le
 * damos la bienvenida, el aviso de ausencia y los atajos de reserva y
 * cancelación. Función pura para facilitar TDD.
 */

export interface EntradaGuiaWhatsapp
{
  readonly clave: string;
  readonly titulo: string;
  readonly ayuda: string;
  readonly texto: string;
}

export interface DatosGuiaWhatsapp
{
  readonly negocioNombre: string;
  readonly portalUrl: string;
}

/**
 * Arma los textos de la guía con el nombre y el link del negocio.
 *
 * @param datos Nombre del negocio y link público de reservas.
 * @return Entradas con título, ayuda y texto para copiar.
 */
export function guiaWhatsapp(datos: DatosGuiaWhatsapp): readonly EntradaGuiaWhatsapp[]
{
  const negocio = datos.negocioNombre.trim().length > 0 ? datos.negocioNombre.trim() : "mi negocio";
  const link = datos.portalUrl.trim();

  return [
    {
      clave: "bienvenida",
      titulo: "Bienvenida",
      ayuda: "Copialo en la app como mensaje de bienvenida.",
      texto: `¡Hola! Gracias por escribir a ${negocio}. Podés reservar tu turno acá: ${link}`,
    },
    {
      clave: "ausencia",
      titulo: "Fuera de horario",
      ayuda: "Usalo cuando no puedas responder al instante.",
      texto: "¡Hola! En este momento no puedo responder. Dejame tu mensaje y te contesto apenas "
        + `pueda. Si querés, reservá tu turno acá: ${link}`,
    },
    {
      clave: "turno",
      titulo: "Atajo: /turno",
      ayuda: "Respuesta rápida que manda el link para reservar.",
      texto: `Para reservar tu turno entrá acá: ${link}`,
    },
    {
      clave: "cancelar",
      titulo: "Atajo: /cancelar",
      ayuda: "Respuesta rápida para pedir que cancelen con tiempo.",
      texto: "Si no podés venir, avisame con tiempo así liberamos el lugar. ¡Gracias!",
    },
  ];
}
