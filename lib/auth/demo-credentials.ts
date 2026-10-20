/**
 * Credenciales de la cuenta demo permanente (PLAN.md Módulo 1).
 *
 * Públicas por diseño (se muestran en `/login`); permiten override
 * vía `DEMO_EMAIL` / `DEMO_PASSWORD` sin hardcodear secretos.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";

export interface DemoCredentials
{
  readonly email: string;
  readonly password: string;
}

const DEFAULT_EMAIL = "demo@turnomas.com";
const DEFAULT_PASSWORD = "demo123";

/** Resuelve email/password demo desde el entorno con fallback público. */
export function getDemoCredentials(env: EnvRecord = process.env): DemoCredentials
{
  return {
    email: readEnv("DEMO_EMAIL", env) ?? DEFAULT_EMAIL,
    password: readEnv("DEMO_PASSWORD", env) ?? DEFAULT_PASSWORD,
  };
}

/**
 * Indica si las credenciales ingresadas son las de la cuenta demo.
 *
 * El email se compara sin distinguir mayúsculas ni espacios; la contraseña
 * debe coincidir exactamente con la configurada.
 *
 * @param email Email ingresado en el login.
 * @param password Contraseña ingresada.
 * @param env Registro de entorno opcional.
 * @return `true` cuando corresponden a la demo.
 */
export function esCredencialDemo(
  email: string,
  password: string,
  env: EnvRecord = process.env,
): boolean
{
  const demo = getDemoCredentials(env);

  return email.trim().toLowerCase() === demo.email.trim().toLowerCase()
    && password === demo.password;
}
