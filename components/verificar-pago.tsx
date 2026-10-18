"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { esRetornoCheckout } from "@/lib/payments/checkout-return";

export interface VerificarPagoProps
{
  readonly recargar?: (url: string) => void;
  readonly intervaloEstadoMs?: number;
  readonly intervaloVerificarMs?: number;
  readonly limiteMs?: number;
}

const DESTINO = "/dashboard/suscripcion";
const INTERVALO_ESTADO_MS = 5000;
const INTERVALO_VERIFICAR_MS = 30000;
const LIMITE_MS = 600000;

/**
 * Reconciliación automática/manual del pago de la suscripción.
 *
 * Al volver del checkout (`?suscripcion=ok`) verifica contra MercadoPago y,
 * mientras el paywall está montado, sondea el estado local para levantarlo solo
 * cuando el plan queda activo (sin recargar a mano). El botón permite
 * reintentar; el sondeo y la reconciliación se detienen tras `limiteMs`.
 *
 * @param props Inyectables para tests: `recargar`, intervalos y límite.
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

  const verificar = useCallback(async (silencioso = false): Promise<void> =>
  {
    if (!silencioso)
    {
      setVerificando(true);
    }

    try
    {
      const response = await fetch("/api/suscripcion/verificar", { method: "POST" });
      const data = await response.json() as { activado?: unknown; estado?: unknown; error?: unknown };

      if (data.activado === true)
      {
        recargar(DESTINO);
        return;
      }

      if (silencioso)
      {
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
      if (!silencioso)
      {
        setMensaje("No pudimos verificar el pago. Probá de nuevo.");
      }
    }
    finally
    {
      if (!silencioso)
      {
        setVerificando(false);
      }
    }
  }, [recargar]);

  // Lectura liviana del estado local: levanta el paywall sin llamar a MP.
  const consultarEstado = useCallback(async (): Promise<void> =>
  {
    try
    {
      const response = await fetch("/api/suscripcion/estado");
      const data = await response.json() as { bloqueado?: unknown };

      if (data.bloqueado === false)
      {
        recargar(DESTINO);
      }
    }
    catch
    {
      // Best-effort: el sondeo no debe romper el paywall.
    }
  }, [recargar]);

  // Verificación automática al volver del checkout.
  useEffect(() =>
  {
    if (params === null || !esRetornoCheckout({
      suscripcion: params.get("suscripcion"),
      preapproval_id: params.get("preapproval_id"),
    }))
    {
      return;
    }

    const timer = setTimeout(() => void verificar(), 0);

    return () => clearTimeout(timer);
  }, [params, verificar]);

  // Sondeo del estado + reconciliación de respaldo mientras el paywall vive.
  useEffect(() =>
  {
    const intervaloEstado = props.intervaloEstadoMs ?? INTERVALO_ESTADO_MS;
    const intervaloVerificar = props.intervaloVerificarMs ?? INTERVALO_VERIFICAR_MS;
    const fin = Date.now() + (props.limiteMs ?? LIMITE_MS);

    const idEstado = setInterval(() =>
    {
      if (Date.now() >= fin)
      {
        clearInterval(idEstado);
        return;
      }

      void consultarEstado();
    }, intervaloEstado);

    const idVerificar = setInterval(() =>
    {
      if (Date.now() >= fin)
      {
        clearInterval(idVerificar);
        return;
      }

      void verificar(true);
    }, intervaloVerificar);

    return () =>
    {
      clearInterval(idEstado);
      clearInterval(idVerificar);
    };
  }, [consultarEstado, verificar, props.intervaloEstadoMs, props.intervaloVerificarMs, props.limiteMs]);

  // Al volver el foco se re-verifica (pudo pagar en otra pestaña).
  useEffect(() =>
  {
    const alVolver = (): void =>
    {
      if (document.visibilityState === "visible")
      {
        void verificar(true);
      }
    };

    document.addEventListener("visibilitychange", alVolver);

    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [verificar]);

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
