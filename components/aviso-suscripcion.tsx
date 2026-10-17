"use client";

import { useSearchParams } from "next/navigation";

/**
 * Aviso de retorno desde MercadoPago cuando la suscripción quedó pendiente.
 *
 * El checkout vuelve a `?suscripcion=ok`; si el webhook todavía no activó el
 * plan, el paywall sigue visible. Este aviso se muestra dentro del overlay
 * para no dejar al usuario sin confirmación.
 *
 * @return Mensaje de confirmación pendiente o null sin el parámetro.
 */
export default function AvisoSuscripcion()
{
  const params = useSearchParams();

  if (params.get("suscripcion") !== "ok")
  {
    return null;
  }

  return (
    <p role="status" className="mt-4 text-xs font-semibold px-3 py-2 rounded-lg border
      bg-green-500/10 text-green-300 border-green-500/30">
      Pago registrado. Tu plan se activa cuando MercadoPago confirma la autorización.
    </p>
  );
}
