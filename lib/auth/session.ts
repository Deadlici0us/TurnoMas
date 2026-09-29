/**
 * Estado de sesión para el header global (Módulo 1).
 *
 * Función pura `resolveSessionState` para TDD; `getSessionState`
 * resuelve en el servidor leyendo la cookie demo y Supabase Auth.
 */

import { cookies } from "next/headers";

import { getSupabaseServer } from "@/lib/supabase/server";

export type SessionState = "authenticated" | "guest";

export interface SessionInput
{
  readonly userId: string | null;
  readonly demoCookie: string | undefined;
}

/**
 * Determina si hay sesión activa por usuario Supabase o cookie demo.
 *
 * @param input userId de Supabase y valor de la cookie `session`.
 * @return "authenticated" si hay usuario o cookie demo, "guest" si no.
 */
export function resolveSessionState(input: SessionInput): SessionState
{
  if (input.userId !== null)
  {
    return "authenticated";
  }

  if (input.demoCookie === "demo")
  {
    return "authenticated";
  }

  return "guest";
}

/**
 * Lee la sesión actual en el servidor sin lanzar si falta configuración.
 *
 * @return "authenticated" cuando hay sesión, "guest" en caso contrario.
 */
export async function getSessionState(): Promise<SessionState>
{
  let demoCookie: string | undefined;

  try
  {
    demoCookie = (await cookies()).get("session")?.value;
  }
  catch
  {
    demoCookie = undefined;
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return resolveSessionState({ userId: user?.id ?? null, demoCookie });
  }
  catch
  {
    return resolveSessionState({ userId: null, demoCookie });
  }
}
