/**
 * Promociones porcentuales del plan SaaS (Módulo 1).
 *
 * Funciones puras para TDD: calculan el precio efectivo de una suscripción
 * según un porcentaje y una ventana de vigencia. El monto se expresa en la
 * unidad de la moneda del plan (ARS/USD), no en centavos, porque MercadoPago
 * recibe `transaction_amount` en unidades mayores.
 */

export interface PromocionVigente
{
  readonly porcentaje: number;
  readonly vigenteDesde: string | Date;
  readonly vigenteHasta: string | Date;
}

export interface PrecioConPromo
{
  readonly montoBase: number;
  readonly montoFinal: number;
  readonly porcentaje: number | null;
  readonly aplicada: boolean;
}

const PORCENTAJE_MINIMO = 1;
const PORCENTAJE_MAXIMO = 99;
const MONTO_MINIMO = 1;

/**
 * Convierte un valor a Date validando que sea una fecha real.
 *
 * @param valor Fecha ISO o instancia de Date.
 * @return Fecha válida.
 * @throws RangeError Cuando el valor no representa una fecha.
 */
function aFecha(valor: string | Date): Date
{
  const fecha = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);

  if (Number.isNaN(fecha.getTime()))
  {
    throw new RangeError("La fecha de la promoción no es válida.");
  }

  return fecha;
}

/**
 * Valida y normaliza una promoción.
 *
 * @param promocion Promoción cruda.
 * @return Porcentaje y ventana ya validados.
 * @throws RangeError Cuando el porcentaje o las fechas no son válidos.
 */
function normalizarPromocion(promocion: PromocionVigente): {
  readonly porcentaje: number;
  readonly desde: Date;
  readonly hasta: Date;
}
{
  if (!Number.isInteger(promocion.porcentaje)
    || promocion.porcentaje < PORCENTAJE_MINIMO
    || promocion.porcentaje > PORCENTAJE_MAXIMO)
  {
    throw new RangeError("El porcentaje de la promoción debe ser un entero entre 1 y 99.");
  }

  const desde = aFecha(promocion.vigenteDesde);
  const hasta = aFecha(promocion.vigenteHasta);

  if (hasta.getTime() <= desde.getTime())
  {
    throw new RangeError("El fin de la promoción debe ser posterior a su inicio.");
  }

  return { porcentaje: promocion.porcentaje, desde, hasta };
}

/**
 * Indica si una promoción está vigente en el momento indicado.
 *
 * El inicio es inclusivo y el fin exclusivo: al llegar `vigenteHasta` la
 * promoción deja de aplicarse.
 *
 * @param promocion Promoción a evaluar.
 * @param ahora Momento de referencia.
 * @return `true` cuando la promo está dentro de su ventana.
 */
export function promocionVigente(promocion: PromocionVigente, ahora: Date = new Date()): boolean
{
  const normalizada = normalizarPromocion(promocion);

  return ahora.getTime() >= normalizada.desde.getTime()
    && ahora.getTime() < normalizada.hasta.getTime();
}

/**
 * Calcula el precio final de un plan aplicando una promo porcentual.
 *
 * Si no hay promo o no está vigente, devuelve el precio base. El resultado
 * nunca baja de 1 unidad para que MercadoPago pueda crear el cobro.
 *
 * @param montoBase Precio mensual base en unidades de la moneda.
 * @param promocion Promoción opcional.
 * @param ahora Momento de referencia.
 * @return Precio base, precio final y porcentaje efectivamente aplicado.
 */
export function calcularPrecioConPromo(
  montoBase: number,
  promocion: PromocionVigente | null,
  ahora: Date = new Date(),
): PrecioConPromo
{
  if (!Number.isInteger(montoBase) || montoBase < MONTO_MINIMO)
  {
    throw new RangeError("El monto base debe ser un entero positivo.");
  }

  if (promocion === null || !promocionVigente(promocion, ahora))
  {
    return { montoBase, montoFinal: montoBase, porcentaje: null, aplicada: false };
  }

  const porcentaje = promocion.porcentaje;
  const montoFinal = Math.max(
    MONTO_MINIMO,
    Math.round((montoBase * (100 - porcentaje)) / 100),
  );

  return { montoBase, montoFinal, porcentaje, aplicada: true };
}

/**
 * Suma meses a una fecha ajustando el día al último disponible del mes.
 *
 * Evita el desborde de JavaScript: 31 de enero + 1 mes es 28/29 de febrero,
 * no 3 de marzo.
 *
 * @param fecha Fecha de partida.
 * @param meses Cantidad de meses a sumar.
 * @return Nueva fecha en UTC.
 * @throws RangeError Cuando `meses` no es un entero positivo.
 */
export function sumarMeses(fecha: Date, meses: number): Date
{
  if (!Number.isInteger(meses) || meses <= 0)
  {
    throw new RangeError("Los meses a sumar deben ser un entero positivo.");
  }

  const resultado = new Date(fecha.getTime());
  const diaOriginal = resultado.getUTCDate();

  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);

  const ultimoDia = new Date(Date.UTC(
    resultado.getUTCFullYear(),
    resultado.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  resultado.setUTCDate(Math.min(diaOriginal, ultimoDia));

  return resultado;
}

/**
 * Calcula el nuevo vencimiento al extender una promoción.
 *
 * Si el vencimiento actual está en el futuro, extiende desde ahí (no pierde
 * días). Si ya venció o no existe, cuenta desde `ahora`.
 *
 * @param vigenteHasta Vencimiento actual (ISO o Date) o null.
 * @param meses Meses adicionales.
 * @param ahora Momento de referencia.
 * @return Nueva fecha de vencimiento.
 */
export function calcularNuevaVigencia(
  vigenteHasta: string | Date | null,
  meses: number,
  ahora: Date = new Date(),
): Date
{
  const actual = vigenteHasta === null ? null : aFecha(vigenteHasta);
  const base = actual !== null && actual.getTime() > ahora.getTime() ? actual : ahora;

  return sumarMeses(base, meses);
}
