"use client";

import { useState } from "react";

export default function FormularioResena({ turnoId }: { readonly turnoId: string })
{
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

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
      const data = await response.json() as { error?: string };

      if (!response.ok)
      {
        setError(typeof data.error === "string" ? data.error : "No pudimos guardar tu calificación.");
        return;
      }

      setEnviado(true);
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

  if (enviado)
  {
    return (
      <div className="space-y-4 text-center">
        <div className="text-5xl">¡Gracias!</div>
        <p className="text-sm text-slate-400">
          Recibimos tu devolución y la vamos a usar para mejorar. ¡Gracias!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 text-center">
        Contanos cómo te fue. Es privado: solo lo ve el negocio.
      </p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => { setEstrellas(n); setError(null); }}
            aria-label={`${n} estrellas`}
            className={`text-4xl transition-all duration-200 hover:scale-110 ${n <= estrellas ? "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" : "text-slate-600 hover:text-slate-500"}`}
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
        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
          placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
      />
      {error !== null ? <p className="text-sm text-rose-300 text-center">{error}</p> : null}
      <button
        onClick={() => { void enviar(); }}
        disabled={enviando}
        className="group relative w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
          rounded-xl hover:bg-brand-500 transition-all duration-300 disabled:opacity-60"
      >
        <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
          bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
        {enviando ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
