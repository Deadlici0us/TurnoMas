/** Resultado serializable de una Server Action. */
export type ActionResult<T = void> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly code: string; readonly error: string };

/**
 * Construye un resultado exitoso.
 *
 * @param data Datos opcionales para el cliente.
 * @return Resultado exitoso.
 */
export function ok<T>(data?: T): ActionResult<T>
{
  return { ok: true, data: data as T };
}

/**
 * Construye un resultado fallido.
 *
 * @param code Código estable del error.
 * @param error Mensaje mostrable.
 * @return Resultado fallido.
 */
export function fail(code: string, error: string): ActionResult<never>
{
  return { ok: false, code, error };
}
