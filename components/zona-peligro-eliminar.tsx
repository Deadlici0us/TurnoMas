"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { confirmarEliminacionNegocio, solicitarEliminacionNegocio } from "@/app/dashboard/config/actions";
import { TEXTO_CONFIRMACION_ELIMINACION } from "@/lib/negocios/eliminacion";

type Paso = "reposo" | "enviando" | "codigo" | "eliminando";

/** Zona de peligro: borrado del negocio con código enviado al email del dueño. */
export default function ZonaPeligroEliminar()
{
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("reposo");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function pedirCodigo(): Promise<void>
  {
    setPaso("enviando");
    setError(null);

    try
    {
      const solicitud = await solicitarEliminacionNegocio();

      setToken(solicitud.token);
      setEmail(solicitud.emailEnmascarado);
      setPaso("codigo");
    }
    catch (e)
    {
      setError(e instanceof Error ? e.message : "No pudimos enviar el email. Probá de nuevo.");
      setPaso("reposo");
    }
  }

  async function confirmar(): Promise<void>
  {
    setPaso("eliminando");
    setError(null);

    try
    {
      await confirmarEliminacionNegocio(token, codigo, texto);
      router.push("/");
    }
    catch (e)
    {
      setError(e instanceof Error ? e.message : "No pudimos eliminar tu negocio. Probá de nuevo.");
      setPaso("codigo");
    }
  }

  return (
    <div className="ui-alert ui-alert-danger space-y-3 p-4">
      <div>
        <div className="text-sm font-semibold">Eliminar mi negocio</div>
        <p className="text-xs text-danger">
          Borra turnos, clientes, servicios, staff e integraciones, y cierra tu cuenta. No se puede deshacer.
        </p>
      </div>
      {error !== null ? <p className="text-xs font-semibold text-danger" role="alert">{error}</p> : null}
      {paso === "codigo" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {`Enviamos un código de 6 dígitos a ${email}. Ingresalo junto con la palabra ${TEXTO_CONFIRMACION_ELIMINACION}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código del email"
              className="ui-input flex-1"
            />
            <input
              type="text"
              autoComplete="off"
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={TEXTO_CONFIRMACION_ELIMINACION}
              className="ui-input flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={paso !== "codigo" || codigo.length !== 6 || texto.length === 0}
              className="ui-btn ui-btn-cta"
            >
              Eliminar definitivamente
            </button>
            <button
              type="button"
              onClick={() => void pedirCodigo()}
              className="ui-btn ui-btn-outline ui-btn-sm"
            >
              Reenviar código
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void pedirCodigo()}
          disabled={paso === "enviando" || paso === "eliminando"}
          className="ui-btn ui-btn-danger"
        >
          {paso === "enviando" ? "Enviando código…" : "Eliminar mi cuenta y mis datos"}
        </button>
      )}
    </div>
  );
}
