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
  readonly precioBase: unknown;
  readonly precioPromocional: unknown;
  readonly promoActiva?: unknown;
  readonly senaRequerida: unknown;
  readonly senaPorcentaje: unknown;
  readonly remarketingActivo?: unknown;
  readonly remarketingDias?: unknown;
}

export interface ServicioValidado
{
  readonly nombre: string;
  readonly duracionMin: number;
  readonly precioBase: number;
  readonly precioPromocional: number | null;
  readonly senaRequerida: boolean;
  readonly senaPorcentaje: number;
  readonly remarketingActivo: boolean;
  readonly remarketingDias: number | null;
}

const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 80;
const PORCENTAJE_MINIMO = 0;
const PORCENTAJE_MAXIMO = 100;
const REMARKETING_MIN_DIAS = 1;
const REMARKETING_MAX_DIAS = 90;

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

  const precioBase = exigirEntero(input.precioBase, "El precio tiene que ser en centavos enteros.");

  if (precioBase <= 0)
  {
    throw new RangeError("El precio tiene que ser mayor a 0.");
  }

  let precioPromocional: number | null = null;

  const promoCrudaPresente = input.precioPromocional !== null && input.precioPromocional !== undefined
    && input.precioPromocional !== "";
  const promoActiva = input.promoActiva === undefined || input.promoActiva === null || input.promoActiva === ""
    ? promoCrudaPresente
    : input.promoActiva === true || input.promoActiva === "on";

  if (promoActiva && promoCrudaPresente)
  {
    const promo = exigirEntero(input.precioPromocional, "La promo tiene que ser en centavos enteros.");

    if (promo <= 0 || promo >= precioBase)
    {
      throw new RangeError("La promo tiene que ser mayor a 0 y menor al precio base.");
    }

    precioPromocional = promo;
  }

  const senaRequerida = input.senaRequerida === true || input.senaRequerida === "on";
  let senaPorcentaje = 0;

  if (senaRequerida)
  {
    senaPorcentaje = exigirEntero(input.senaPorcentaje, "La seña tiene que ser un porcentaje entero.");

    if (senaPorcentaje < PORCENTAJE_MINIMO || senaPorcentaje > PORCENTAJE_MAXIMO)
    {
      throw new RangeError("La seña tiene que estar entre 0% y 100%.");
    }
  }

  const remarketingActivo = input.remarketingActivo === undefined || input.remarketingActivo === null
    ? true
    : input.remarketingActivo === true || input.remarketingActivo === "on";
  let remarketingDias: number | null = null;

  if (remarketingActivo && input.remarketingDias !== null && input.remarketingDias !== undefined
    && input.remarketingDias !== "")
  {
    const dias = exigirEntero(input.remarketingDias, "El remarketing tiene que ser en días enteros.");

    if (dias < REMARKETING_MIN_DIAS || dias > REMARKETING_MAX_DIAS)
    {
      throw new RangeError("El remarketing tiene que estar entre 1 y 90 días.");
    }

    remarketingDias = dias;
  }

  return {
    nombre,
    duracionMin,
    precioBase,
    precioPromocional,
    senaRequerida,
    senaPorcentaje,
    remarketingActivo,
    remarketingDias,
  };
}
