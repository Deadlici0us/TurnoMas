/**
 * Validación pura de servicios del negocio.
 *
 * Espeja los `check` de `supabase/migrations/0000_init.sql` para fallar
 * rápido en la Server Action con mensajes en es-AR.
 */

import { limpiarControl } from "@/lib/validation/texto";

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

/**
 * Valida el nombre del servicio.
 *
 * @param nombre Valor crudo del nombre.
 * @return Nombre recortado válido.
 */
function validarNombre(nombre: unknown): string
{
  if (typeof nombre !== "string")
  {
    throw new RangeError("El nombre del servicio tiene que ser texto.");
  }

  const recortado = limpiarControl(nombre);

  if (recortado.length < NOMBRE_MINIMO || recortado.length > NOMBRE_MAXIMO)
  {
    throw new RangeError("El nombre del servicio tiene que tener entre 2 y 80 caracteres.");
  }

  return recortado;
}

/**
 * Valida la promo opcional contra el precio base.
 *
 * @param input Entrada cruda del servicio.
 * @param precioBase Precio base ya validado.
 * @return Precio promocional o null.
 */
function validarPromo(input: ServicioInput, precioBase: number): number | null
{
  const presente = input.precioPromocional !== null && input.precioPromocional !== undefined
    && input.precioPromocional !== "";
  const activa = input.promoActiva === undefined || input.promoActiva === null || input.promoActiva === ""
    ? presente
    : input.promoActiva === true || input.promoActiva === "on";

  if (!activa || !presente)
  {
    return null;
  }

  const promo = exigirEntero(input.precioPromocional, "La promo tiene que ser en centavos enteros.");

  if (promo <= 0 || promo >= precioBase)
  {
    throw new RangeError("La promo tiene que ser mayor a 0 y menor al precio base.");
  }

  return promo;
}

/**
 * Valida la seña opcional del servicio.
 *
 * @param input Entrada cruda del servicio.
 * @return Seña normalizada.
 */
function validarSena(input: ServicioInput): { readonly requerida: boolean; readonly porcentaje: number }
{
  const requerida = input.senaRequerida === true || input.senaRequerida === "on";

  if (!requerida)
  {
    return { requerida: false, porcentaje: 0 };
  }

  const porcentaje = exigirEntero(input.senaPorcentaje, "La seña tiene que ser un porcentaje entero.");

  if (porcentaje < PORCENTAJE_MINIMO || porcentaje > PORCENTAJE_MAXIMO)
  {
    throw new RangeError("La seña tiene que estar entre 0% y 100%.");
  }

  return { requerida: true, porcentaje };
}

/**
 * Valida el remarketing opcional del servicio.
 *
 * @param input Entrada cruda del servicio.
 * @return Remarketing normalizado.
 */
function validarRemarketing(input: ServicioInput): { readonly activo: boolean; readonly dias: number | null }
{
  const activo = input.remarketingActivo === undefined || input.remarketingActivo === null
    ? true
    : input.remarketingActivo === true || input.remarketingActivo === "on";

  if (!activo || input.remarketingDias === null || input.remarketingDias === undefined
    || input.remarketingDias === "")
  {
    return { activo, dias: null };
  }

  const dias = exigirEntero(input.remarketingDias, "El remarketing tiene que ser en días enteros.");

  if (dias < REMARKETING_MIN_DIAS || dias > REMARKETING_MAX_DIAS)
  {
    throw new RangeError("El remarketing tiene que estar entre 1 y 90 días.");
  }

  return { activo, dias };
}

/** Valida y normaliza los datos de un servicio (crear o editar). */
export function validarServicio(input: ServicioInput): ServicioValidado
{
  const nombre = validarNombre(input.nombre);
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

  const precioPromocional = validarPromo(input, precioBase);
  const sena = validarSena(input);
  const remarketing = validarRemarketing(input);

  return {
    nombre,
    duracionMin,
    precioBase,
    precioPromocional,
    senaRequerida: sena.requerida,
    senaPorcentaje: sena.porcentaje,
    remarketingActivo: remarketing.activo,
    remarketingDias: remarketing.dias,
  };
}
