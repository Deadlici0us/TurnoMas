/**
 * Links `wa.me` para refuerzo manual por WhatsApp (fase 1 sin Meta API).
 *
 * La agenda y clientes generan el link con el texto ya interpolado;
 * el dueño lo abre y envía en 1 clic. Función pura para TDD.
 */

/** Normaliza un WhatsApp guardado a dígitos con código país para wa.me. */
export function normalizarWhatsappParaLink(whatsapp: unknown): string | null
{
  if (typeof whatsapp !== "string")
  {
    return null;
  }

  const digitos = whatsapp.replace(/\D/g, "");

  return digitos.length >= 6 && digitos.length <= 20 ? digitos : null;
}

/** Arma el link wa.me con texto pre-cargado (null si el número no sirve). */
export function linkWhatsapp(whatsapp: unknown, texto: string): string | null
{
  const numero = normalizarWhatsappParaLink(whatsapp);

  if (numero === null || texto.trim().length === 0)
  {
    return null;
  }

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto.trim().slice(0, 1000))}`;
}
