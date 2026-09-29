"use client";

import { useState } from "react";

type Resultado =
  | { readonly destino: "google-maps"; readonly mapsUrl: string }
  | { readonly destino: "feedback-interno" };

export default function FormularioResena({ turnoId }: { readonly turnoId: string })
{
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function enviar(): Promise<void>
  {
    if (estrellas < 1 || estrellas > 5)
    {
      setError("Elegí de 1 a 5 estrellas.");
      return;
    }

    setEnviando(true);
    setError(null);

    try
    {
      const response = await fetch("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnoId, estrellas, comentario: comentario.trim() }),
      });
      const data = await response.json() as Resultado & { error?: string };

      if (!response.ok)
      {
        setError(typeof data.error === "string" ? data.error : "No pudimos guardar tu calificación.");
        return;
      }

      setResultado(data.destino === "google-maps"
        ? { destino: "google-maps", mapsUrl: (data as { mapsUrl: string }).mapsUrl }
        : { destino: "feedback-interno" });
    }
    catch
    {
      setError("No pudimos guardar tu calificación. Probá de nuevo.");
    }
    finally
    {
      setEnviando(false);
    }
  }

  if (resultado !== null)
  {
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">¡Gracias!</div>
        {resultado.destino === "google-maps" ? (
          <a
            href={resultado.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Dejanos tu reseña en Google
          </a>
        ) : (
          <p className="text-sm text-slate-600">
            Recibimos tu devolución y la vamos a usar para mejorar. ¡Gracias!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => { setEstrellas(n); setError(null); }}
            aria-label={`${n} estrellas`}
            className={`text-4xl transition-colors ${n <= estrellas ? "text-amber-400" : "text-slate-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
        placeholder="Contanos más (opcional)"
        rows={3}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {error !== null ? <p className="text-sm text-red-600 text-center">{error}</p> : null}
      <button
        onClick={() => { void enviar(); }}
        disabled={enviando}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700
          transition-colors disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Enviar calificación"}
      </button>
    </div>
  );
}
