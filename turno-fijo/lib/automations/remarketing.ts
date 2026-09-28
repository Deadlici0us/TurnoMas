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
