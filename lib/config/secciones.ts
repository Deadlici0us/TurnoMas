/**
 * Submenús de Configuración del dashboard.
 *
 * Agrupa las secciones para no mostrar una página eterna. La sección activa
 * viaja por query param (`?seccion=`), así el dueño puede compartir o
 * refrescar sin perder el contexto.
 */

export type SeccionConfigId =
  | "general"
  | "horarios"
  | "clientes"
  | "cobros"
  | "mensajes"
  | "cuenta";

export interface SeccionConfigDef
{
  readonly id: SeccionConfigId;
  readonly etiqueta: string;
  readonly descripcion: string;
}

export const SECCIONES_CONFIG: readonly SeccionConfigDef[] =
[
  {
    id: "general",
    etiqueta: "General",
    descripcion: "Datos del negocio, contacto y link público.",
  },
  {
    id: "horarios",
    etiqueta: "Horarios y avisos",
    descripcion: "Horarios de atención y avisos automáticos a tus clientes.",
  },
  {
    id: "clientes",
    etiqueta: "Clientes",
    descripcion: "Reglas de faltas y remarketing.",
  },
  {
    id: "cobros",
    etiqueta: "Cobros",
    descripcion: "Señas y medios de cobro.",
  },
  {
    id: "mensajes",
    etiqueta: "Mensajes",
    descripcion: "Personalizá los mensajes que enviamos por email.",
  },
  {
    id: "cuenta",
    etiqueta: "Cuenta",
    descripcion: "Eliminar tu cuenta y todos los datos.",
  },
];

const IDS: ReadonlySet<string> = new Set(SECCIONES_CONFIG.map((seccion) => seccion.id));

/**
 * Normaliza la sección activa recibida por query param.
 *
 * Si viene un aviso de MercadoPago (`?mp=...`) y no hay sección explícita,
 * abre Cobros para que el dueño vea el resultado de la conexión.
 *
 * @param valor Valor crudo de `?seccion=`.
 * @param conAvisoMp Verdadero cuando la URL trae `?mp=...`.
 * @return Sección válida.
 */
export function normalizarSeccionConfig(valor: unknown, conAvisoMp = false): SeccionConfigId
{
  if (typeof valor === "string" && IDS.has(valor))
  {
    return valor as SeccionConfigId;
  }

  return conAvisoMp ? "cobros" : "general";
}
