/**
 * Modo de autenticación (Módulo 1): Supabase Auth en Vercel con secrets,
 * modo demo local sin secrets para build y tests.
 *
 * Funciones puras para facilitar TDD; las Server Actions las usan
 * para decidir si llaman a Supabase o resuelven en memoria.
 */

import type { EnvRecord } from "@/lib/env/env";
import { isSupabaseConfigured } from "@/lib/env/env";
import { buildBusinessUrl, slugifyBusinessName } from "@/lib/onboarding/slug";

export type AuthMode = "supabase" | "demo";

export interface OnboardingResult
{
  readonly pais: string;
  readonly slug: string;
  readonly url: string;
  readonly mercadoPagoConectado: boolean;
  readonly whatsappConectado: boolean;
}

/** Resuelve el modo de auth según secrets disponibles (sin exponer valores). */
export function resolveAuthMode(env: EnvRecord = process.env): AuthMode
{
  return isSupabaseConfigured(env) ? "supabase" : "demo";
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
