/**
 * Aviso de migración a OAuth de MercadoPago (fail-closed en señas).
 *
 * Los negocios con servicios con seña pero sin MP conectado pasan a
 * "pendiente sin link" al cobrar: hay que avisarles antes de que
 * les pase con clientes reales.
 */

export interface ServicioSenaRow
{
  readonly sena_requerida?: unknown;
}

/**
 * Indica si hay que avisar al dueño que conecte MercadoPago.
 *
 * @param mpToken Token del negocio o null si no conectó.
 * @param servicios Servicios del negocio.
 * @return True con seña activa y sin conexión.
 */
export function debeAvisarConexionMp(
  mpToken: string | null,
  servicios: readonly ServicioSenaRow[],
): boolean
{
  if (mpToken !== null && mpToken.trim().length > 0)
  {
    return false;
  }

  return servicios.some((servicio) => servicio.sena_requerida === true);
}

/**
 * Destino del aviso al fallar la desconexión de MercadoPago.
 *
 * El guarda de seña activa debe mostrar mensaje (?mp=sena-activa) en vez
 * de 500; los errores inesperados devuelven null para propagarse.
 *
 * @param error Error lanzado por `desconectarMercadoPago`.
 * @return URL de aviso o null cuando debe propagarse.
 */
export function destinoDesconexionMp(error: unknown): string | null
{
  if (error instanceof Error && error.message.includes("seña activa"))
  {
    return "/dashboard/config?mp=sena-activa";
  }

  return null;
}
