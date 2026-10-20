/**
 * Etiquetas amigables para Configuración (gente poco tecnológica).
 *
 * Traduce identificadores técnicos (zonas IANA, penalidades, plantillas)
 * a lenguaje simple en es-AR. Todo es puro para facilitar TDD.
 */

import { VARIABLES_POR_TIPO, textoDefault } from "@/lib/notifications/templates";
import type
{
  CanalPlantilla,
  TipoPlantillaConfigurable,
  VarianteConfirmacion,
} from "@/lib/notifications/templates";

/** Ciudad y país legible por cada zona IANA soportada. */
export const ZONAS_AMIGABLES: Readonly<Record<string, string>> =
{
  "America/Argentina/Buenos_Aires": "Buenos Aires, Argentina",
  "America/Montevideo": "Montevideo, Uruguay",
  "America/Asuncion": "Asunción, Paraguay",
  "America/Santiago": "Santiago, Chile",
  "America/Bogota": "Bogotá, Colombia",
  "America/Lima": "Lima, Perú",
  "America/Sao_Paulo": "San Pablo, Brasil",
  "America/Mexico_City": "Ciudad de México, México",
  "America/Cancun": "Cancún, México",
  "America/Tijuana": "Tijuana, México",
  "America/New_York": "Nueva York, EE. UU.",
  "Europe/Madrid": "Madrid, España",
  "Europe/London": "Londres, Reino Unido",
};

/** Penalidad de faltas en palabras simples. */
export type PenalidadAmigable = "blocked" | "fullDeposit";

/**
 * Traduce una zona IANA a ciudad y país.
 *
 * @param zona Zona IANA (ej. America/Mexico_City).
 * @return Etiqueta amigable o la zona cruda si no está mapeada.
 */
export function etiquetaZonaHoraria(zona: unknown): string
{
  if (typeof zona !== "string")
  {
    return "";
  }

  return ZONAS_AMIGABLES[zona] ?? zona;
}

/**
 * Explica la penalidad por faltas sin tecnicismos.
 *
 * @param penalidad Código de penalidad.
 * @return Texto simple para el selector.
 */
export function etiquetaPenalidad(penalidad: unknown): string
{
  if (penalidad === "blocked")
  {
    return "No dejar reservar más";
  }

  return "Pedir seña completa";
}

/**
 * Arma el ejemplo de faltas en lenguaje simple.
 *
 * @param umbral Cantidad de faltas que dispara la medida.
 * @param penalidad Código de penalidad.
 * @return Frase de ejemplo (ej. Si un cliente falta 2 veces...).
 */
export function ejemploFaltas(umbral: number, penalidad: PenalidadAmigable): string
{
  const veces = umbral === 1 ? "1 vez" : `${umbral} veces`;

  if (penalidad === "blocked")
  {
    return `Si un cliente falta ${veces}, no lo dejamos reservar más.`;
  }

  return `Si un cliente falta ${veces}, le pedimos seña completa para reservar.`;
}

/**
 * Arma el ejemplo de seña con horas simples.
 *
 * @param retencionHs Horas de anticipación para devolver la seña.
 * @return Frase de ejemplo en lenguaje simple.
 */
export function ejemploSena(retencionHs: number): string
{
  return `Si cancela faltando más de ${retencionHs} hs, le devolvemos la seña. ` +
    "Si cancela con menos tiempo, la pierde.";
}

/** Un ejemplo grisado con su canal y, si aplica, variante. */
export interface EjemploMensaje
{
  readonly canal: CanalPlantilla;
  readonly variante?: VarianteConfirmacion;
  readonly etiqueta: string;
  readonly subject: string | null;
  readonly cuerpo: string;
}

export interface PlantillaAmigable
{
  readonly tipo: TipoPlantillaConfigurable;
  readonly titulo: string;
  readonly ayuda: string;
  readonly variables: readonly string[];
  /** El asunto solo se muestra para los mensajes que lo usan (email). */
  readonly usaSubject: boolean;
  /** Ejemplo principal para el placeholder del formulario. */
  readonly ejemploSubject: string;
  readonly ejemploCuerpo: string;
  /** Todos los defaults que se envían cuando los campos quedan vacíos. */
  readonly ejemplos: readonly EjemploMensaje[];
}

const COMODINES_EJEMPLO = {
  cliente: "{cliente}",
  negocio: "{negocio}",
  servicio: "{servicio}",
  profesional: "{profesional}",
  fecha: "{fecha}",
} as const;

/** Genera un ejemplo grisado con el texto exacto del default de ese canal. */
function crearEjemplo(
  tipo: TipoPlantillaConfigurable,
  canal: CanalPlantilla,
  etiqueta: string,
  variante?: VarianteConfirmacion,
): EjemploMensaje
{
  const texto = textoDefault(tipo, COMODINES_EJEMPLO, { canal, variante });

  return {
    canal,
    variante,
    etiqueta,
    subject: canal === "email" ? texto.subject : null,
    cuerpo: texto.cuerpo,
  };
}

const EJEMPLOS_CONFIRMACION: readonly EjemploMensaje[] =
[
  crearEjemplo("confirmacion", "email", "Email · Sin seña", "sin_sena"),
  crearEjemplo("confirmacion", "email", "Email · Con seña", "con_sena"),
];

const EJEMPLOS_RECORDATORIO: readonly EjemploMensaje[] =
[
  crearEjemplo("recordatorio", "email", "Email"),
  crearEjemplo("recordatorio", "whatsapp", "WhatsApp"),
];

const EJEMPLOS_RESENA: readonly EjemploMensaje[] =
[
  crearEjemplo("resena", "email", "Email"),
  crearEjemplo("resena", "whatsapp", "WhatsApp"),
];

const EJEMPLOS_REMARKETING: readonly EjemploMensaje[] =
[
  crearEjemplo("remarketing", "whatsapp", "WhatsApp"),
];

/** Las 4 plantillas con título simple, comodines y todos sus defaults. */
export const PLANTILLAS_AMIGABLES: readonly PlantillaAmigable[] =
[
  {
    tipo: "confirmacion",
    titulo: "Cuando alguien reserva",
    ayuda: "Confirmamos la reserva con fecha, servicio y profesional.",
    variables: VARIABLES_POR_TIPO.confirmacion,
    usaSubject: true,
    ejemploSubject: EJEMPLOS_CONFIRMACION[0]?.subject ?? "",
    ejemploCuerpo: EJEMPLOS_CONFIRMACION[0]?.cuerpo ?? "",
    ejemplos: EJEMPLOS_CONFIRMACION,
  },
  {
    tipo: "recordatorio",
    titulo: "Un día antes del turno",
    ayuda: "Recordatorio para que nadie se olvide de venir.",
    variables: VARIABLES_POR_TIPO.recordatorio,
    usaSubject: true,
    ejemploSubject: EJEMPLOS_RECORDATORIO[0]?.subject ?? "",
    ejemploCuerpo: EJEMPLOS_RECORDATORIO[0]?.cuerpo ?? "",
    ejemplos: EJEMPLOS_RECORDATORIO,
  },
  {
    tipo: "resena",
    titulo: "Después del turno: pedir opinión",
    ayuda: "Pedimos una opinión cuando termina el turno.",
    variables: VARIABLES_POR_TIPO.resena,
    usaSubject: true,
    ejemploSubject: EJEMPLOS_RESENA[0]?.subject ?? "",
    ejemploCuerpo: EJEMPLOS_RESENA[0]?.cuerpo ?? "",
    ejemplos: EJEMPLOS_RESENA,
  },
  {
    tipo: "remarketing",
    titulo: "Mensaje de remarketing",
    ayuda: "Invita a repetir el servicio (corte, uñas, depilación…).",
    variables: VARIABLES_POR_TIPO.remarketing,
    usaSubject: false,
    ejemploSubject: "",
    ejemploCuerpo: EJEMPLOS_REMARKETING[0]?.cuerpo ?? "",
    ejemplos: EJEMPLOS_REMARKETING,
  },
];
