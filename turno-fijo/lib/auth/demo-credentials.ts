/**
 * Credenciales de la cuenta demo permanente (PLAN.md Módulo 1).
 *
 * Públicas por diseño (se muestran en `/demo`); permiten override
 * vía `DEMO_EMAIL` / `DEMO_PASSWORD` sin hardcodear secretos.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

export interface DemoCredentials
{
  readonly email: string;
  readonly password: string;
}

const DEFAULT_EMAIL = "demo@turnofijo.com";
const DEFAULT_PASSWORD = "demo123";

/** Resuelve email/password demo desde el entorno con fallback público. */
export function getDemoCredentials(env: EnvRecord = process.env): DemoCredentials
{
  return {
    email: readEnv("DEMO_EMAIL", env) ?? DEFAULT_EMAIL,
    password: readEnv("DEMO_PASSWORD", env) ?? DEFAULT_PASSWORD,
  };
}
