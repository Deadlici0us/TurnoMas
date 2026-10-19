"use client";

import { useState } from "react";

export interface SuscripcionFormProps
{
  readonly idPrefix: string;
  readonly navegar?: (url: string) => void;
  readonly emailInicial?: string;
}

const MENSAJE_GENERICO = "No pudimos activar el plan. Probá de nuevo.";
const MENSAJE_SIN_EMAIL = "Ingresá el email de tu cuenta de MercadoPago.";

/**
 * Formulario de activación del plan: pide el email de la cuenta de
 * MercadoPago del pagador y redirige al checkout (saldo en cuenta o tarjeta).
 *
 * Envía `POST /api/suscripcion/crear`; en éxito navega al `initPoint` de MP y
 * en error conserva el email y muestra el mensaje inline (sin recargar).
 * `navegar` se inyecta en tests; por defecto usa `window.location.assign`.
 *
 * @param props Prefijo de IDs único por contexto (`paywall`/`suscripcion`),
 *   navegador opcional para tests y email inicial editable de la cuenta.
 * @return Formulario con control de email y botón de pago.
 */
export default function SuscripcionForm(props: SuscripcionFormProps)
{
  const [email, setEmail] = useState(props.emailInicial ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = `${props.idPrefix}-payer-email`;

  async function enviar(event: React.SyntheticEvent<HTMLFormElement>): Promise<void>
  {
    event.preventDefault();

    const payerEmail = email.trim();

    if (payerEmail.length === 0)
    {
      setError(MENSAJE_SIN_EMAIL);
      return;
    }

    setEnviando(true);
    setError(null);

    try
    {
      const response = await fetch("/api/suscripcion/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerEmail }),
      });
      const data = await response.json() as {
        initPoint?: unknown;
        activado?: unknown;
        error?: unknown;
        detalle?: unknown;
      };
      const ir = props.navegar ?? ((url: string): void => { window.location.assign(url); });

      if (data.activado === true)
      {
        ir("/dashboard/suscripcion");
        return;
      }

      const initPoint = typeof data.initPoint === "string" ? data.initPoint : null;

      if (!response.ok || initPoint === null)
      {
        const mensaje = typeof data.error === "string" ? data.error : MENSAJE_GENERICO;
        const detalle = typeof data.detalle === "string" && data.detalle.length > 0
          ? ` ${data.detalle}`
          : "";
        setError(`${mensaje}${detalle}`);
        setEnviando(false);
        return;
      }

      ir(initPoint);
    }
    catch
    {
      setError(MENSAJE_GENERICO);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={(event) => void enviar(event)} className="space-y-3">
      <label htmlFor={emailId} className="block text-sm font-medium text-ink">
        Email de tu cuenta de MercadoPago
      </label>
      <input
        id={emailId}
        type="email"
        name="payerEmail"
        required
        placeholder="tu-cuenta@ejemplo.com"
        autoComplete="email"
        value={email}
        disabled={enviando}
        onChange={(event) => setEmail(event.target.value)}
        className="ui-input h-11"
      />
      {error !== null ? (
        <p role="alert" className="ui-alert ui-alert-danger text-xs font-semibold">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={enviando}
        className="ui-btn ui-btn-primary w-full"
      >
        {enviando ? (
          <>
            <span className="ui-spinner" aria-hidden="true" />
            Redirigiendo…
          </>
        ) : "Pagar con MercadoPago"}
      </button>
    </form>
  );
}
