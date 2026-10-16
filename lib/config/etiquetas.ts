/**
 * Etiquetas amigables para Configuración (gente poco tecnológica).
 *
 * Traduce identificadores técnicos (zonas IANA, penalidades, plantillas)
 * a lenguaje simple en es-AR. Todo es puro para facilitar TDD.
 */

import type { TipoPlantillaConfigurable } from "@/lib/notifications/custom-templates";

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

export interface PlantillaAmigable
{
  readonly tipo: TipoPlantillaConfigurable;
  readonly titulo: string;
  readonly ayuda: string;
}

/** Las 4 plantillas con títulos simples (sin subject ni remarketing). */
export const PLANTILLAS_AMIGABLES: readonly PlantillaAmigable[] =
[
  {
    tipo: "confirmacion",
    titulo: "Cuando alguien reserva",
    ayuda: "Confirmamos la reserva con fecha, servicio y profesional.",
  },
  {
    tipo: "recordatorio",
    titulo: "Un día antes del turno",
    ayuda: "Recordatorio para que nadie se olvide de venir.",
  },
  {
    tipo: "resena",
    titulo: "Después del turno: pedir opinión",
    ayuda: "Pedimos una opinión cuando termina el turno.",
  },
  {
    tipo: "remarketing",
    titulo: "Mensaje de remarketing",
    ayuda: "Invita a repetir el servicio (corte, uñas, depilación…).",
  },
];
