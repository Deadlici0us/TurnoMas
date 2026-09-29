/**
 * Token de MercadoPago por negocio (P1, señas delegadas PLAN.md §2).
 *
 * El dueño pega su `access token` en Configuración; se guarda en
 * `negocio_secretos` y se usa para sus señas. Sin token del negocio
 * se cae al `MP_ACCESS_TOKEN` de la plataforma. Nunca loguear valores.
 */

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status?: number }>;

const MP_API_BASE = "https://api.mercadopago.com";
const MIN_TOKEN_LENGTH = 8;

/** Valida formato mínimo (prefijo MP o largo suficiente, sin espacios). */
export function isValidMpTokenFormat(token: string): boolean
{
  const value = token.trim();

  if (value.length < MIN_TOKEN_LENGTH || /\s/.test(value))
  {
    return false;
  }

  return value.startsWith("APP_USR-") || value.startsWith("TEST-") || value.length >= MIN_TOKEN_LENGTH;
}

/** Enmascara el token para la UI (solo últimos 4 visibles). */
export function maskMpToken(token: string | null): string
{
  if (token === null || token.length === 0)
  {
    return "—";
  }

  return `••••${token.slice(-4)}`;
}

/** Resuelve el token efectivo: negocio primero, plataforma como fallback. */
export function resolveEffectiveMpToken(
  businessToken: string | null,
  platformToken: string | null,
): string | null
{
  if (businessToken !== null && businessToken.trim().length > 0)
  {
    return businessToken;
  }

  if (platformToken !== null && platformToken.trim().length > 0)
  {
    return platformToken;
  }

  return null;
}

/** Verifica el token contra `GET /users/me` de MercadoPago. */
export async function verifyMpToken(token: string, fetchFn: FetchLike = fetch): Promise<boolean>
{
  try
  {
    const response = await fetchFn(`${MP_API_BASE}/users/me`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } });

    return response.ok;
  }
  catch
  {
    return false;
  }
}
