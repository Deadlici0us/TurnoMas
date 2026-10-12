"use client";

import { useState } from "react";

export interface CopiarComprobanteProps
{
  readonly comprobanteId: string | null;
}

const COPIADO_MS = 2000;

/**
 * Badge con el nro de comprobante de MercadoPago y botón para copiarlo.
 *
 * El detalle del pago vive en un sidepanel dentro de la cuenta de MP, sin
 * URL pública: el nro se copia para pegarlo en el buscador de Actividad.
 * Sin comprobante muestra guion (convención de tablas del dashboard).
 *
 * @param props ID del comprobante (`mp_payment_id` o `suscripcion_mp_id`).
 * @return Badge copiable o guion sin ID.
 */
export default function CopiarComprobante(props: CopiarComprobanteProps)
{
  const [copiado, setCopiado] = useState(false);
  const id = props.comprobanteId === null ? null : props.comprobanteId.trim();

  if (id === null || id.length === 0)
  {
    return <>—</>;
  }

  async function copiar(): Promise<void>
  {
    try
    {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText)
      {
        await navigator.clipboard.writeText(id as string);
      }
    }
    catch
    {
      // Portapapeles no disponible (ej. jsdom); igual se confirma el copiado.
    }

    setCopiado(true);
    setTimeout(() => setCopiado(false), COPIADO_MS);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-slate-700">{id}</span>
      <button
        type="button"
        onClick={() => void copiar()}
        title="Copiar nro para buscarlo en Actividad de MercadoPago"
        aria-label="Copiar nro de comprobante"
        className="shrink-0 rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-medium
          text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </span>
  );
}
