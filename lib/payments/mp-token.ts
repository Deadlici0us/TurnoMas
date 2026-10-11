/**
 * Token de MercadoPago por negocio (P1, señas delegadas PLAN.md §2).
 *
 * El dueño pega su `access token` en Configuración; se guarda en
 * `negocio_secretos` y se usa para sus señas. Sin token del negocio
 * se cae al `MP_ACCESS_TOKEN` de la plataforma. Nunca loguear valores.
 */

/** Enmascara el token para la UI (solo últimos 4 visibles). */
export function maskMpToken(token: string | null): string
{
  if (token === null || token.length === 0)
  {
    return "—";
  }

  return `••••${token.slice(-4)}`;
}

/** Error fail-closed: el negocio debe conectar su MP (sin fallback a plataforma). */
export const SIN_MP_MESSAGE = "Este negocio aún no conectó MercadoPago para cobrar señas.";

export class NegocioSinMpError extends Error
{
  constructor(message: string = SIN_MP_MESSAGE)
  {
    super(message);
    this.name = "NegocioSinMpError";
  }
}

/**
 * Exige el token propio del negocio para señas delegadas.
 *
 * @param businessToken Token guardado en `negocio_secretos` o null.
 * @return El token del negocio.
 */
export function requireBusinessMpToken(businessToken: string | null): string
{
  if (businessToken === null || businessToken.trim().length === 0)
  {
    throw new NegocioSinMpError();
  }

  return businessToken;
}

/**
 * Resuelve el token efectivo: negocio primero, plataforma como fallback.
 *
 * Reservado para las suscripciones SaaS (cobro de la plataforma al negocio).
 * Las señas delegadas usan `requireBusinessMpToken` (fail-closed).
 */
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
