/**
 * Candado de solo lectura para la cuenta demo (PLAN.md Módulo 1).
 *
 * La demo existe para explorar, no para modificar: toda Server Action que
 * escriba debe llamar a `assertModoEditable` antes de tocar la base. El
 * candado reconoce el modo local sin Supabase, la cookie `session=demo` y
 * sesiones Supabase heredadas del dueño demo.
 *
 * El portal público del negocio demo también es de solo lectura: reservas y
 * reseñas se simulan sin persistir (ver `lib/portal/demo-business.ts`).
 */

import type { EnvRecord } from "@/lib/env/env";
import { isSupabaseConfigured, readEnv } from "@/lib/env/env";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";
import { tieneCookieDemo } from "@/lib/auth/demo-cookie";
import { getSupabaseServer } from "@/lib/supabase/server";

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

/**
 * Lanza si la request actual es de solo lectura (demo).
 *
 * Cubre el modo local sin Supabase, la cookie demo y una sesión Supabase
 * heredada del dueño demo. Los errores de Supabase se ignoran: la acción que
 * llama al guard resolverá luego el usuario y fallará antes de escribir.
 *
 * @param env Registro de entorno opcional.
 */
export async function assertModoEditable(env: EnvRecord = process.env): Promise<void>
{
  if (resolveAuthMode(env) === "demo" || await tieneCookieDemo())
  {
    throw new Error(DEMO_READONLY_MESSAGE);
  }

  if (!isSupabaseConfigured(env))
  {
    return;
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user !== null)
    {
      assertDuenoEditable({ userId: user.id, email: user.email ?? null }, env);
    }
  }
  catch (error)
  {
    if (error instanceof Error && error.message === DEMO_READONLY_MESSAGE)
    {
      throw error;
    }
  }
}
