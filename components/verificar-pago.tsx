"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export interface VerificarPagoProps
{
  readonly recargar?: (url: string) => void;
}

const DESTINO = "/dashboard/facturacion";

/**
 * Reconciliación manual/automática del pago de la suscripción.
 *
 * Al volver del checkout (`?suscripcion=ok`) verifica una vez contra
 * MercadoPago; el botón permite reintentar. Si el plan queda activo, recarga
 * el dashboard para quitar el paywall sin volver a pagar.
 *
 * @param props `recargar` se inyecta en tests; por defecto usa
 *   `window.location.assign`.
 * @return Botón de verificación con su mensaje de estado.
 */
export default function VerificarPago(props: VerificarPagoProps)
{
  const params = useSearchParams();
  const [verificando, setVerificando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const recargar = useCallback((url: string): void =>
  {
    (props.recargar ?? ((destino: string): void => { window.location.assign(destino); }))(url);
  }, [props.recargar]);

  const verificar = useCallback(async (): Promise<void> =>
  {
    setVerificando(true);

    try
    {
      const response = await fetch("/api/suscripcion/verificar", { method: "POST" });
      const data = await response.json() as { activado?: unknown; estado?: unknown; error?: unknown };

      if (data.activado === true)
      {
        recargar(DESTINO);
        return;
      }

      if (data.estado === "pending")
      {
        setMensaje("MercadoPago todavía no confirmó el pago. Probá de nuevo en unos minutos.");
      }
      else
      {
        setMensaje(typeof data.error === "string"
          ? data.error
          : "Todavía no encontramos un pago acreditado para tu cuenta.");
      }
    }
    catch
    {
      setMensaje("No pudimos verificar el pago. Probá de nuevo.");
    }
    finally
    {
      setVerificando(false);
    }
  }, [recargar]);

  useEffect(() =>
  {
    if (params.get("suscripcion") !== "ok")
    {
      return;
    }

    const timer = setTimeout(() => void verificar(), 0);

    return () => clearTimeout(timer);
  }, [params, verificar]);

  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        onClick={() => void verificar()}
        disabled={verificando}
        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-60
          transition-colors"
      >
        {verificando ? "Verificando…" : "Ya pagué, verificar ahora"}
      </button>
      {mensaje !== null ? (
        <p role="status" className="mt-2 text-xs font-semibold px-3 py-2 rounded-lg border
          bg-amber-500/10 text-amber-200 border-amber-500/30">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
