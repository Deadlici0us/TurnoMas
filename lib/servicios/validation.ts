/**
 * Validación pura de servicios del negocio.
 *
 * Espeja los `check` de `supabase/migrations/0000_init.sql` para fallar
 * rápido en la Server Action con mensajes en es-AR.
 */

export interface ServicioInput
{
  readonly nombre: unknown;
  readonly duracionMin: unknown;
  readonly bufferMin: unknown;
  readonly precioBase: unknown;
  readonly precioPromocional: unknown;
  readonly senaRequerida: unknown;
  readonly senaPorcentaje: unknown;
}

export interface ServicioValidado
{
  readonly nombre: string;
  readonly duracionMin: number;
  readonly bufferMin: number;
  readonly precioBase: number;
  readonly precioPromocional: number | null;
  readonly senaRequerida: boolean;
  readonly senaPorcentaje: number;
}

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;
const PORCENTAJE_MINIMO = 1;
const PORCENTAJE_MAXIMO = 100;

function exigirEntero(valor: unknown, mensaje: string): number
{
  if (typeof valor !== "number" || !Number.isInteger(valor))
  {
    throw new RangeError(mensaje);
  }

  return valor;
}

/** Valida y normaliza los datos de un servicio (crear o editar). */
export function validarServicio(input: ServicioInput): ServicioValidado
{
  if (typeof input.nombre !== "string")
  {
    throw new RangeError("El nombre del servicio tiene que ser texto.");
  }

  const nombre = input.nombre.trim();

  if (nombre.length < NOMBRE_MINIMO || nombre.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del servicio tiene que tener entre 2 y 80 caracteres.");
  }

  const duracionMin = exigirEntero(input.duracionMin, "La duración tiene que ser en minutos enteros.");

  if (duracionMin <= 0)
  {
    throw new RangeError("La duración tiene que ser mayor a 0 minutos.");
  }

  const bufferMin = exigirEntero(input.bufferMin, "La limpieza tiene que ser en minutos enteros.");

  if (bufferMin < 0)
  {
    throw new RangeError("La limpieza no puede ser negativa.");
  }

  const precioBase = exigirEntero(input.precioBase, "El precio tiene que ser en centavos enteros.");

  if (precioBase <= 0)
  {
    throw new RangeError("El precio tiene que ser mayor a 0.");
  }

  let precioPromocional: number | null = null;

  if (input.precioPromocional !== null && input.precioPromocional !== undefined && input.precioPromocional !== "")
  {
    const promo = exigirEntero(input.precioPromocional, "La promo tiene que ser en centavos enteros.");

    if (promo <= 0 || promo >= precioBase)
    {
      throw new RangeError("La promo tiene que ser mayor a 0 y menor al precio base.");
    }

    precioPromocional = promo;
  }

  const senaPorcentaje = exigirEntero(input.senaPorcentaje, "La seña tiene que ser un porcentaje entero.");

  if (senaPorcentaje < PORCENTAJE_MINIMO || senaPorcentaje > PORCENTAJE_MAXIMO)
  {
    throw new RangeError("La seña tiene que estar entre 1% y 100%.");
  }

  return {
    nombre,
    duracionMin,
    bufferMin,
    precioBase,
    precioPromocional,
    senaRequerida: input.senaRequerida === true || input.senaRequerida === "on",
    senaPorcentaje,
  };
}
