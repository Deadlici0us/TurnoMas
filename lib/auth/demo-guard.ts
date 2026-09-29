/**
 * Candado de solo lectura para la cuenta demo (PLAN.md Módulo 1).
 *
 * La demo existe para explorar, no para modificar: toda Server Action que
 * escriba debe llamar a `assertModoEditable` + `assertDuenoEditable` antes
 * de tocar la base. El portal público (`POST /api/reservas`) queda abierto
 * por diseño: los clientes sí pueden reservar en el negocio demo.
 *
 * Funciones puras (salvo lectura de `process.env`) para facilitar TDD.
 */

import type { EnvRecord } from "@/lib/env/env";
import { readEnv } from "@/lib/env/env";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";

/** Mensaje único de bloqueo: se muestra en UI con CTA a `/register`. */
export const DEMO_READONLY_MESSAGE =
  "La cuenta demo es de solo lectura. Creá tu cuenta gratis para hacer cambios.";

export interface DemoIdentity
{
  readonly userId: string | null;
  readonly email: string | null;
}

/** Indica si la identidad pertenece al dueño demo (email o `DEMO_DUENIO_ID`). */
export function isDemoOwner(identity: DemoIdentity, env: EnvRecord = process.env): boolean
{
  const email = identity.email?.trim().toLowerCase() ?? "";
  const demoEmail = getDemoCredentials(env).email.trim().toLowerCase();

  if (email.length > 0 && email === demoEmail)
  {
    return true;
  }

  const ownerId = readEnv("DEMO_DUENIO_ID", env);
  const userId = identity.userId?.trim() ?? "";

  return ownerId !== null && userId.length > 0 && userId === ownerId;
}

/** Lanza si el dueño autenticado es la cuenta demo. */
export function assertDuenoEditable(identity: DemoIdentity, env: EnvRecord = process.env): void
{
  if (isDemoOwner(identity, env))
  {
    throw new Error(DEMO_READONLY_MESSAGE);
  }
}

/** Lanza si no hay Supabase configurado (sesión demo local sin dueño real). */
export async function assertModoEditable(env: EnvRecord = process.env): Promise<void>
{
  if (resolveAuthMode(env) === "demo")
  {
    throw new Error(DEMO_READONLY_MESSAGE);
  }
}
