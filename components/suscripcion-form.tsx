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
      <label htmlFor={emailId} className="block text-sm font-medium text-slate-300">
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
        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
          placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
      />
      {error !== null ? (
        <p role="alert" className="text-xs font-semibold px-3 py-2 rounded-lg border
          bg-rose-500/10 text-rose-300 border-rose-500/30">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={enviando}
        className="group relative block w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
          rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
          transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
          bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
        {enviando ? "Redirigiendo…" : "Pagar con MercadoPago"}
      </button>
    </form>
  );
}
