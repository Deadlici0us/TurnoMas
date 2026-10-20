/**
 * Normalización de WhatsApp de clientes para agrupar reservas del mismo
 * número escritas en formatos argentinos distintos.
 *
 * El valor canónico es E.164 móvil argentino (`+549...`), que es el que
 * espera `wa.me`. Los números de otros países que vienen con `+` se guardan
 * como su E.164. Función pura para TDD.
 */

const MIN_DIGITOS = 8;
const MAX_DIGITOS = 15;
const LARGO_NACIONAL_AR = 10;
const LARGO_LEGACY_AR = 9;
const LARGO_CON_QUINCE = 12;
const LARGOS_AREA = [2, 3, 4] as const;

export const WHATSAPP_VACIO = "Ingresá el WhatsApp del cliente.";
export const WHATSAPP_CARACTERES_INVALIDOS =
  "El WhatsApp solo puede tener números, espacios, +, guiones y paréntesis.";
export const WHATSAPP_LARGO_INVALIDO =
  "El WhatsApp tiene que tener entre 8 y 15 dígitos.";
export const WHATSAPP_NUMERO_INVALIDO =
  "No pudimos reconocer ese número. Revisá el código de área y el número.";

/** Resultado del análisis de un WhatsApp para la UI y las Server Actions. */
export type AnalisisWhatsapp =
  | { readonly ok: true; readonly valor: string }
  | { readonly ok: false; readonly error: string };

/**
 * Quita el `15` de un número argentino escrito en formato local.
 *
 * @param nacional Dígitos nacionales sin `0` ni `9` iniciales.
 * @return Número nacional de 10 dígitos o null si no se reconoce.
 */
function quitarQuince(nacional: string): string | null
{
  if (nacional.length === LARGO_NACIONAL_AR)
  {
    return nacional;
  }

  // Números viejos del CRM que quedaron cortos (7 dígitos de abonado).
  // Se conservan para no romper reservas ni datos de demo existentes.
  if (nacional.length === LARGO_LEGACY_AR)
  {
    return nacional;
  }

  if (nacional.length !== LARGO_CON_QUINCE)
  {
    return null;
  }

  for (const largoArea of LARGOS_AREA)
  {
    if (nacional.slice(largoArea, largoArea + 2) !== "15")
    {
      continue;
    }

    const sinQuince = nacional.slice(0, largoArea) + nacional.slice(largoArea + 2);

    if (sinQuince.length === LARGO_NACIONAL_AR)
    {
      return sinQuince;
    }
  }

  return null;
}

/**
 * Normaliza un número argentino a E.164 móvil.
 *
 * @param digitos Dígitos sin código país.
 * @return Número canónico o null si no es un número argentino reconocible.
 */
function normalizarArgentina(digitos: string): string | null
{
  let nacional = digitos.replace(/^0+/, "");

  if (nacional.startsWith("9"))
  {
    nacional = nacional.slice(1);
  }

  if (nacional.startsWith("15"))
  {
    return null;
  }

  const numero = quitarQuince(nacional);

  return numero === null ? null : `+549${numero}`;
}

/**
 * Analiza un WhatsApp crudo sin lanzar excepciones.
 *
 * @param valor Valor del formulario o de la base.
 * @return Resultado con el número canónico o el mensaje de error.
 */
export function analizarWhatsappCliente(valor: unknown): AnalisisWhatsapp
{
  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return { ok: false, error: WHATSAPP_VACIO };
  }

  const texto = valor.trim();

  if (!/^[+\d\s().-]+$/.test(texto))
  {
    return { ok: false, error: WHATSAPP_CARACTERES_INVALIDOS };
  }

  const posicionMas = texto.indexOf("+");

  if (posicionMas !== -1 && (posicionMas !== 0 || texto.indexOf("+", 1) !== -1))
  {
    return { ok: false, error: WHATSAPP_CARACTERES_INVALIDOS };
  }

  const digitos = texto.replace(/\D/g, "");

  if (digitos.length < MIN_DIGITOS || digitos.length > MAX_DIGITOS)
  {
    return { ok: false, error: WHATSAPP_LARGO_INVALIDO };
  }

  const explicito = texto.startsWith("+") || digitos.startsWith("00");
  const sinPrefijo = digitos.startsWith("00") ? digitos.slice(2) : digitos;

  if (sinPrefijo.startsWith("54"))
  {
    const canonico = normalizarArgentina(sinPrefijo.slice(2));

    return canonico === null
      ? { ok: false, error: WHATSAPP_NUMERO_INVALIDO }
      : { ok: true, valor: canonico };
  }

  if (explicito)
  {
    if (sinPrefijo.startsWith("0") || sinPrefijo.length < 7)
    {
      return { ok: false, error: WHATSAPP_NUMERO_INVALIDO };
    }

    return { ok: true, valor: `+${sinPrefijo}` };
  }

  const canonico = normalizarArgentina(sinPrefijo);

  return canonico === null
    ? { ok: false, error: WHATSAPP_NUMERO_INVALIDO }
    : { ok: true, valor: canonico };
}

/**
 * Devuelve el WhatsApp canónico o lanza un error con el motivo.
 *
 * @param valor Valor del formulario o de la base.
 * @return Número en formato E.164.
 * @throws RangeError cuando el número no es válido.
 */
export function normalizarWhatsappCliente(valor: unknown): string
{
  const analisis = analizarWhatsappCliente(valor);

  if (!analisis.ok)
  {
    throw new RangeError(analisis.error);
  }

  return analisis.valor;
}
