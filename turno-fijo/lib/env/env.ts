/**
 * Entorno de hosting (IHostingEnvironment, PLAN.md 2.1).
 *
 * Lectura perezosa y sin excepciones en import: el build local y los
 * tests corren sin secrets; en Vercel se inyectan los 14 secrets del PLAN.md.
 * Nunca loguear ni exponer valores de secrets.
 */

export type EnvRecord = Record<string, string | undefined>;

/** Lee una variable recortando espacios; ausente o en blanco → null. */
export function readEnv(name: string, env: EnvRecord = process.env): string | null
{
  const raw = env[name];

  if (raw === undefined)
  {
    return null;
  }

  const value = raw.trim();

  return value.length > 0 ? value : null;
}

/** Indica si Supabase Auth/DB está configurable (URL + clave pública). */
export function isSupabaseConfigured(env: EnvRecord = process.env): boolean
{
  return readEnv("NEXT_PUBLIC_SUPABASE_URL", env) !== null
    && readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env) !== null;
}

/** Indica si hay clave privada de servicio de Supabase (solo servidor). */
export function hasSupabaseServiceKey(env: EnvRecord = process.env): boolean
{
  return readEnv("SUPABASE_SECRET_KEY", env) !== null;
}
