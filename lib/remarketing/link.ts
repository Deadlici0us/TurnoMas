/**
 * Link de WhatsApp prellenado para contacto manual de remarketing.
 *
 * Reusa `textoWhatsapp` y `linkWhatsapp`; se usa tanto en el panel
 * "Recuperar" como en la página Clientes.
 */

import { textoWhatsapp } from "@/lib/notifications/custom-templates";
import { linkWhatsapp } from "@/lib/notifications/whatsapp";

export interface LinkRemarketingProps
{
  readonly whatsapp: string;
  readonly portalUrl: string | null;
  readonly negocioNombre: string;
  readonly msg_remarketing_subject: string | null;
  readonly msg_remarketing_cuerpo: string | null;
  readonly servicioNombre: string;
}

/** Devuelve el wa.me link o null si no hay portal. */
export function linkRemarketingWhatsapp(props: LinkRemarketingProps): string | null
{
  if (props.portalUrl === null)
  {
    return null;
  }

  return linkWhatsapp(props.whatsapp, textoWhatsapp("remarketing", {
    subject: props.msg_remarketing_subject,
    cuerpo: props.msg_remarketing_cuerpo,
  }, {
    negocio: props.negocioNombre,
    servicio: props.servicioNombre,
    profesional: "",
    fecha: "",
  }, props.portalUrl));
}