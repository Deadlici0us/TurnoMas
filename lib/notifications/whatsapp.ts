/**
 * Links `wa.me` para refuerzo manual por WhatsApp (fase 1 sin Meta API).
 *
 * La agenda y clientes generan el link con el texto ya interpolado;
 * el dueño lo abre y envía en 1 clic. Función pura para TDD.
 */

import { normalizarWhatsappCliente } from "@/lib/clientes/whatsapp";

/**
 * Normaliza un WhatsApp guardado a dígitos con código país para wa.me.
 *
 * Usa el formato canónico del CRM y cae a la limpieza histórica solo para
 * valores legacy que no tengan letras ni caracteres raros.
 */
export function normalizarWhatsappParaLink(whatsapp: unknown): string | null
{
  if (typeof whatsapp !== "string")
  {
    return null;
  }

  try
  {
    return normalizarWhatsappCliente(whatsapp).replace(/^\+/, "");
  }
  catch
  {
    // Compatibilidad con números viejos que no pasan el formato canónico.
  }

  if (!/^[+\d\s().-]+$/.test(whatsapp.trim()))
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
