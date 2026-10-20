/**
 * Cookie de sesión demo temporal.
 *
 * Módulo sin dependencias de Supabase para poder usarlo desde el guard de
 * escritura sin ciclos de importación.
 */

import { cookies } from "next/headers";

/** Nombre de la cookie de sesión demo (compartida con el modo local). */
export const DEMO_COOKIE = "session";

/** Valor que identifica una sesión demo temporal. */
export const DEMO_COOKIE_VALUE = "demo";

/** Indica si un valor de cookie representa la sesión demo. */
export function esCookieDemo(valor: string | undefined): boolean
{
  return valor === DEMO_COOKIE_VALUE;
}

/**
 * Lee la cookie demo sin lanzar fuera de un request (build/tests).
 *
 * @return `true` cuando la request trae `session=demo`.
 */
export async function tieneCookieDemo(): Promise<boolean>
{
  try
  {
    return esCookieDemo((await cookies()).get(DEMO_COOKIE)?.value);
  }
  catch
  {
    return false;
  }
}
