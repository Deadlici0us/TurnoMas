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
        <li key={item.clave} className="p-4 border border-white/10 rounded-xl bg-white/5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">{item.titulo}</div>
              <div className="text-xs text-slate-400">{item.ayuda}</div>
            </div>
            <button
              type="button"
              onClick={() => void copiar(item.clave, item.texto)}
              className="shrink-0 text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                text-slate-200 hover:bg-white/10 transition-colors min-h-[44px]"
            >
              {copiada === item.clave ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words rounded-lg
            bg-slate-950/40 border border-white/10 p-3">
            {item.texto}
          </p>
        </li>
      ))}
    </ul>
  );
}
