/**
 * Carriles para bloques que se solapan en la grilla de la agenda.
 *
 * Lógica pura: recibe intervalos ya proyectados (por ejemplo `top` y
 * `top + height`) y calcula cuántos carriles necesita cada grupo de
 * bloques solapados. Los intervalos contiguos no comparten carril.
 */

/** Intervalo mínimo para ubicar un bloque dentro de la grilla. */
export interface IntervaloAgenda
{
  readonly key: string;
  readonly inicio: number;
  readonly fin: number;
}

/** Posición horizontal de un bloque dentro de su grupo solapado. */
export interface CarrilAgenda
{
  readonly carril: number;
  readonly carriles: number;
}

/**
 * Asigna un carril a cada bloque y el total de carriles de su grupo.
 *
 * @param bloques Intervalos con clave única; `inicio` y `fin` en la misma unidad.
 * @return Los bloques válidos con `carril` (base 0) y `carriles` (total del grupo).
 */
export function asignarCarriles<T extends IntervaloAgenda>(
  bloques: readonly T[],
): Array<T & CarrilAgenda>
{
  const ordenados = bloques
    .filter((bloque) => bloque.fin > bloque.inicio)
    .slice()
    .sort((a, b) => a.inicio - b.inicio || b.fin - a.fin || a.key.localeCompare(b.key));
  const salida: Array<T & CarrilAgenda> = [];
  let grupo: T[] = [];
  let finGrupo = Number.NEGATIVE_INFINITY;

  const volcarGrupo = (): void =>
  {
    const finPorCarril: number[] = [];
    const carrilPorBloque = new Map<T, number>();

    for (const bloque of grupo)
    {
      let carril = finPorCarril.findIndex((fin) => fin <= bloque.inicio);

      if (carril === -1)
      {
        carril = finPorCarril.length;
        finPorCarril.push(bloque.fin);
      }
      else
      {
        finPorCarril[carril] = bloque.fin;
      }

      carrilPorBloque.set(bloque, carril);
    }

    const carriles = Math.max(finPorCarril.length, 1);

    for (const bloque of grupo)
    {
      salida.push({ ...bloque, carril: carrilPorBloque.get(bloque) ?? 0, carriles });
    }

    grupo = [];
    finGrupo = Number.NEGATIVE_INFINITY;
  };

  for (const bloque of ordenados)
  {
    if (grupo.length > 0 && bloque.inicio >= finGrupo)
    {
      volcarGrupo();
    }

    grupo.push(bloque);
    finGrupo = Math.max(finGrupo, bloque.fin);
  }

  if (grupo.length > 0)
  {
    volcarGrupo();
  }

  return salida;
}
