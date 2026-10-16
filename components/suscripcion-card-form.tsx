"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2";
const CONTAINER_ID = "suscripcion-card-brick";

interface MpFormData
{
  readonly token?: string;
  readonly payer?: { readonly email?: string };
}

interface BrickController
{
  unmount: () => void;
}

interface BrickSettings
{
  readonly initialization: { readonly amount: number };
  readonly callbacks: {
    readonly onReady: () => void;
    readonly onSubmit: (formData: MpFormData) => Promise<void>;
    readonly onError: (error: unknown) => void;
  };
}

interface MpInstance
{
  bricks: () => { create: (type: string, container: string, settings: BrickSettings) => Promise<BrickController> };
}

declare global
{
  interface Window
  {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MpInstance;
  }
}

/** Carga el SDK JS v2 de MercadoPago una sola vez. */
function cargarSdk(): Promise<void>
{
  if (window.MercadoPago !== undefined)
  {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) =>
  {
    const script = document.createElement("script");
    script.src = MP_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No pudimos cargar MercadoPago."));
    document.body.appendChild(script);
  });
}

export interface SuscripcionCardFormProps
{
  readonly publicKey: string;
  readonly monto: number;
  readonly emailPagador: string;
}

/**
 * Formulario de pago con el Card Payment Brick de MercadoPago.
 *
 * Tokeniza la tarjeta en el navegador y crea la suscripción autorizada
 * contra `/api/suscripcion/crear`. El pagador puede usar su propia cuenta.
 */
export default function SuscripcionCardForm({ publicKey, monto, emailPagador }: SuscripcionCardFormProps)
{
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const controllerRef = useRef<BrickController | null>(null);
  const router = useRouter();

  useEffect(() =>
  {
    let cancelado = false;

    async function init(): Promise<void>
    {
      try
      {
        await cargarSdk();

        if (cancelado || window.MercadoPago === undefined)
        {
          return;
        }

        const mp = new window.MercadoPago(publicKey, { locale: "es-AR" });
        const controller = await mp.bricks().create("cardPayment", CONTAINER_ID, {
          initialization: { amount: monto },
          callbacks: {
            onReady: () =>
            {
              if (!cancelado)
              {
                setListo(true);
              }
            },
            onSubmit: (formData) => new Promise<void>((resolve, reject) =>
            {
              fetch("/api/suscripcion/crear", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cardTokenId: formData.token ?? "",
                  payerEmail: formData.payer?.email ?? emailPagador,
                }),
              })
                .then(async (response) =>
                {
                  const data = (await response.json().catch(() => ({}))) as { error?: unknown };

                  if (!response.ok)
                  {
                    reject(new Error(
                      typeof data.error === "string" ? data.error : "No pudimos activar el plan.",
                    ));

                    return;
                  }

                  router.push("/dashboard/facturacion?suscripcion=ok");
                  resolve();
                })
                .catch(reject);
            }),
            onError: (err) =>
            {
              setError(err instanceof Error ? err.message : "No pudimos procesar el pago.");
            },
          },
        });

        if (cancelado)
        {
          controller.unmount();

          return;
        }

        controllerRef.current = controller;
      }
      catch (err)
      {
        setError(err instanceof Error ? err.message : "No pudimos cargar el pago.");
      }
    }

    void init();

    return () =>
    {
      cancelado = true;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [publicKey, monto, emailPagador, router]);

  return (
    <div>
      <div id={CONTAINER_ID} />
      {!listo && error === null ? (
        <p className="mt-2 text-xs text-slate-400">Cargando el formulario de pago…</p>
      ) : null}
      {error !== null ? (
        <p className="mt-2 text-xs font-semibold text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
