/**
 * Boomerang de remarketing (Módulo 5): invita a renovar el servicio
 * a los X días del turno cuando aún no se marcó `remarketing_enviado`.
 *
 * Función pura para facilitar TDD; el cron de QStash la usará
 * para filtrar clientes a contactar.
 */

export interface TurnoParaRemarketing
{
  readonly fin: Date;
  readonly remarketingEnviado: boolean;
}

const MS_PER_DAY = 86_400_000;

export const REMARKETING_DEFAULT_DIAS = 30;
export const REMARKETING_MIN_DIAS = 1;
export const REMARKETING_MAX_DIAS = 90;

/**
 * Resuelve los días efectivos de remarketing: el servicio manda
 * (`servicios.remarketing_dias`), si es null hereda el default del
 * negocio (`negocios.remarketing_dias`), y ante valor inválido cae a 30.
 */
export function resolverRemarketingDias(valorServicio: unknown, valorNegocio: unknown): number
{
  for (const candidato of [valorServicio, valorNegocio])
  {
    if (typeof candidato === "number" && Number.isFinite(candidato))
    {
      const entero = Math.floor(candidato);

      if (entero >= REMARKETING_MIN_DIAS && entero <= REMARKETING_MAX_DIAS)
      {
        return entero;
      }
    }
  }

  return REMARKETING_DEFAULT_DIAS;
}

/** Indica si corresponde enviar el mensaje de remarketing. */
export function shouldSendRemarketing(
  turno: TurnoParaRemarketing,
  ahora: Date,
  diasEspera: number,
): boolean
{
  if (!Number.isInteger(diasEspera) || diasEspera <= 0)
  {
    throw new RangeError("Los días de espera deben ser un entero positivo.");
  }

  if (turno.remarketingEnviado)
  {
    return false;
  }

  return ahora.getTime() - turno.fin.getTime() >= diasEspera * MS_PER_DAY;
}
