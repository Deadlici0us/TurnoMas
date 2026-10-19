/**
 * Autorización del panel admin mínimo (ADMIN_EMAIL).
 *
 * Un solo email administra las promociones del plan. La comparación es
 * trim + case-insensitive y falla cerrado si la variable no está configurada.
 * No reemplaza RLS: el panel usa service role solo después de esta guardia.
 */

import { readEnv } from "@/lib/env/env";
import type { EnvRecord } from "@/lib/env/env";

/** Mensaje único para acciones administrativas no autorizadas. */
export const ADMIN_NO_AUTORIZADO = "No autorizado.";

/**
 * Indica si un email pertenece al administrador configurado.
 *
 * @param email Email de la sesión autenticada.
 * @param env Registro de entorno (por defecto `process.env`).
 * @return `true` solo cuando coincide exactamente con `ADMIN_EMAIL`.
 */
export function isAdminEmail(
  email: string | null | undefined,
  env: EnvRecord = process.env,
): boolean
{
  const admin = readEnv("ADMIN_EMAIL", env)?.toLowerCase() ?? "";
  const actual = typeof email === "string" ? email.trim().toLowerCase() : "";

  return admin.length > 0 && actual.length > 0 && actual === admin;
}

/**
 * Lanza si el email no es el administrador configurado.
 *
 * @param email Email de la sesión autenticada.
 * @param env Registro de entorno (por defecto `process.env`).
 * @throws Error con mensaje genérico para no filtrar la configuración.
 */
export function assertAdminEmail(
  email: string | null | undefined,
  env: EnvRecord = process.env,
): void
{
  if (!isAdminEmail(email, env))
  {
    throw new Error(ADMIN_NO_AUTORIZADO);
  }
}
