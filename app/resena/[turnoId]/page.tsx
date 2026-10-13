import { notFound } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import FormularioResena from "./formulario-resena";

interface ResenaParams
{
  readonly turnoId: string;
}

/** Página pública de calificación (link del email del recolector). */
export default async function ResenaPage({ params }: { readonly params: Promise<ResenaParams> })
{
  const { turnoId } = await params;

  let titulo = "Calificá tu turno";

  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("turnos")
      .select("id, negocio:negocios(nombre), servicio:servicios(nombre)")
      .eq("id", turnoId).single();

    if (data !== null)
    {
      const row = data as unknown as {
        negocio: { nombre: string } | null; servicio: { nombre: string } | null;
      };

      if (row.negocio?.nombre)
      {
        titulo = `¿Cómo te fue en ${row.negocio.nombre}?`;
      }
    }
    else
    {
      notFound();
    }
  }
  catch
  {
    notFound();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="max-w-md w-full px-8 py-12">
        <div className="animate-reveal-up rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6
          backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
          <h1 className="text-2xl font-bold text-white text-center">{titulo}</h1>
          <FormularioResena turnoId={turnoId} />
        </div>
      </div>
    </div>
  );
}
