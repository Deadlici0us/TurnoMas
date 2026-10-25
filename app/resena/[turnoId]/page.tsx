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
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div data-reveal="true" className="ui-card space-y-6 p-6 sm:p-8">
          <h1 className="ui-page-title text-center">{titulo}</h1>
          <FormularioResena turnoId={turnoId} />
        </div>
      </div>
    </div>
  );
}
