"use client";

import { useState } from "react";

import type { EntradaGuiaWhatsapp } from "@/lib/notifications/guia-whatsapp";

interface GuiaWhatsappProps
{
  /** Textos listos para pegar (ya interpolados con nombre y link). */
  readonly items: readonly EntradaGuiaWhatsapp[];
}

/**
 * Guía de WhatsApp con textos listos para copiar y pegar en la app.
 *
 * Sin Meta API el dueño responde a mano: acá tiene la bienvenida, el
 * aviso de ausencia y los atajos de reserva y cancelación.
 *
 * @param items Entradas de la guía.
 * @return Lista de textos con botón Copiar.
 */
export default function GuiaWhatsapp({ items }: GuiaWhatsappProps)
{
  const [copiada, setCopiada] = useState<string | null>(null);

  async function copiar(clave: string, texto: string): Promise<void>
  {
    try
    {
      await navigator.clipboard.writeText(texto);
      setCopiada(clave);
      window.setTimeout(() => setCopiada((actual) => (actual === clave ? null : actual)), 2000);
    }
    catch
    {
      setCopiada(null);
    }
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.clave} className="ui-card space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{item.titulo}</div>
              <div className="text-xs text-muted-foreground">{item.ayuda}</div>
            </div>
            <button
              type="button"
              onClick={() => void copiar(item.clave, item.texto)}
              className="ui-btn ui-btn-outline ui-btn-sm shrink-0"
            >
              {copiada === item.clave ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="rounded-lg border border-line bg-surface p-3 text-sm break-words whitespace-pre-wrap text-ink">
            {item.texto}
          </p>
        </li>
      ))}
    </ul>
  );
}
