"use client";

import { useState } from "react";

interface ResultadoCancelacion
{
  readonly success?: boolean;
  readonly reembolso?: string;
  readonly error?: string;
}

/**
 * Traduce el estado del reembolso a un mensaje legible para el cliente.
 *
 * @param reembolso Estado devuelto por la cancelación.
 * @return Mensaje de confirmación según el reembolso.
 */
function mensajeReembolso(reembolso: string | undefined): string
{
  if (reembolso === "devuelta")
  {
    return "Turno cancelado. Tu seña vuelve a tu cuenta en los próximos días.";
  }

  if (reembolso === "retenida")
  {
    return "Turno cancelado. La seña quedó retenida por la política del negocio.";
  }

  return "Turno cancelado.";
}

/** Formulario de confirmación de cancelación (botón anti doble-clic). */
export default function FormularioCancelacion(
  { turnoId, token }: { readonly turnoId: string; readonly token: string },
)
{
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCancelacion | null>(null);

  async function confirmar(): Promise<void>
  {
    if (enviando)
    {
      return;
    }

    setEnviando(true);

    try
    {
      const response = await fetch("/api/mis-turnos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnoId, token }),
      });
      const body = (await response.json()) as ResultadoCancelacion;

      setResultado(body.success === true ? body : { error: body.error ?? "No pudimos cancelar." });
    }
    catch
    {
      setResultado({ error: "No pudimos cancelar el turno. Probá de nuevo." });
    }
    finally
    {
      setEnviando(false);
    }
  }

  if (resultado?.success === true)
  {
    return (
      <p className="ui-alert ui-alert-success text-sm text-center">
        {mensajeReembolso(resultado.reembolso)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {typeof resultado?.error === "string" ? (
        <p className="text-sm text-danger text-center">{resultado.error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void confirmar()}
        disabled={enviando}
        className="ui-btn ui-btn-cta w-full"
      >
        {enviando ? "Cancelando…" : "Confirmar cancelación"}
      </button>
    </div>
  );
}
