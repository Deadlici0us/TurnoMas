/**
 * Resultado del onboarding: slug, URL pública y conexiones pendientes.
 *
 * Funciones puras para facilitar TDD y reutilización en Server Actions.
 */

import { buildBusinessUrl, slugifyBusinessName } from "@/lib/onboarding/slug";

export interface OnboardingResult
{
  readonly pais: string;
  readonly slug: string;
  readonly url: string;
  readonly mercadoPagoConectado: boolean;
  readonly whatsappConectado: boolean;
}

/** Construye el resultado del onboarding: slug, URL y conexiones pendientes. */
export function buildOnboardingResult(pais: string, nombre: string): OnboardingResult
{
  const normalizedCountry = pais.trim().toLowerCase();

  return {
    pais: normalizedCountry,
    slug: slugifyBusinessName(nombre),
    url: buildBusinessUrl(normalizedCountry, nombre),
    mercadoPagoConectado: false,
    whatsappConectado: false,
  };
}
