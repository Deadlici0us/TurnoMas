/**
 * Boomerang de remarketing (Módulo 5): calcula cuándo a un cliente ya le toca
 * repetir su servicio (a los X días del turno). El contacto es manual por
 * WhatsApp desde el panel; ya no hay envío automático por email.
 *
 * Funciones puras para facilitar TDD.
 */

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

/** Calcula la fecha límite para ofrecer remarketing: fin del turno + días de espera. */
export function fechaObjetivoRemarketing(fin: Date, diasEspera: number): Date
{
  if (!Number.isInteger(diasEspera) || diasEspera <= 0)
  {
    throw new RangeError("Los días de espera deben ser un entero positivo.");
  }

  return new Date(fin.getTime() + diasEspera * MS_PER_DAY);
}

/**
 * Clasifica un turno terminado según cuándo venció su fecha límite de remarketing.
 * Devuelve null si todavía no toca contactar. atrasoDias >= 0 significa que ya venció:
 * 0 toca hoy, 1 o más está atrasado esa cantidad de días.
 */
export function clasificarRemarketing(
  fin: Date,
  diasEspera: number,
  ahora: Date,
): { readonly atrasoDias: number } | null
{
  if (!Number.isInteger(diasEspera) || diasEspera <= 0)
  {
    throw new RangeError("Los días de espera deben ser un entero positivo.");
  }

  const objetivo = fechaObjetivoRemarketing(fin, diasEspera).getTime();
  const atrasoDias = Math.max(0, Math.floor((ahora.getTime() - objetivo) / MS_PER_DAY));

  return ahora.getTime() >= objetivo ? { atrasoDias } : null;
}
