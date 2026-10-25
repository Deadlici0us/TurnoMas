/**
 * Estado de sesión para el header global (Módulo 1).
 *
 * Función pura `resolveSessionState` para TDD; `getSessionState`
 * resuelve en el servidor leyendo Supabase Auth.
 */

import { getSupabaseServer } from "@/lib/supabase/server";

export type SessionState = "authenticated" | "guest";

export interface SessionInput
{
  readonly userId: string | null;
}

/**
 * Determina si hay sesión activa por usuario Supabase.
 *
 * @param input userId de Supabase.
 * @return "authenticated" si hay usuario, "guest" si no.
 */
export function resolveSessionState(input: SessionInput): SessionState
{
  return input.userId !== null ? "authenticated" : "guest";
}

/**
 * Lee la sesión actual en el servidor sin lanzar si falta configuración.
 *
 * @return "authenticated" cuando hay sesión, "guest" en caso contrario.
 */
export async function getSessionState(): Promise<SessionState>
{
  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return resolveSessionState({ userId: user?.id ?? null });
  }
  catch
  {
    return resolveSessionState({ userId: null });
  }
}
