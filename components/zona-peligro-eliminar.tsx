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
    <div className="p-4 border border-red-200 bg-red-50/50 rounded-lg space-y-3">
      <div>
        <div className="text-sm font-semibold text-red-900">Eliminar mi negocio</div>
        <p className="text-xs text-red-700">
          Borra turnos, clientes, servicios, staff e integraciones, y cierra tu cuenta. No se puede deshacer.
        </p>
      </div>
      {error !== null ? <p className="text-xs font-semibold text-red-700" role="alert">{error}</p> : null}
      {paso === "codigo" ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
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
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <input
              type="text"
              autoComplete="off"
              required
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={TEXTO_CONFIRMACION_ELIMINACION}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={paso !== "codigo" || codigo.length !== 6 || texto.length === 0}
              className="bg-red-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Eliminar definitivamente
            </button>
            <button
              type="button"
              onClick={() => void pedirCodigo()}
              className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                text-slate-600 hover:bg-white transition-colors"
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
          className="bg-white text-red-700 text-sm font-semibold px-6 py-2 rounded-lg border
            border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {paso === "enviando" ? "Enviando código…" : "Eliminar mi cuenta y mis datos"}
        </button>
      )}
    </div>
  );
}
