import { notFound } from "next/navigation";

import { verificarTokenCancelacion } from "@/lib/cancelacion/token";
import { readEnv } from "@/lib/env/env";
import { horasRestantesPara, resolverRetencionHs } from "@/lib/payments/refund-policy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatearEnZona, resolverTimezoneNegocio } from "@/lib/timezone/timezone";

import FormularioCancelacion from "./formulario-cancelacion";

interface CancelarParams
{
  readonly turnoId: string;
}

/** Página pública de cancelación (link mágico del email/WhatsApp). */
export default async function CancelarPage(
  { params, searchParams }: {
    readonly params: Promise<CancelarParams>;
    readonly searchParams: Promise<{ token?: string }>;
  },
)
{
  const { turnoId } = await params;
  const { token } = await searchParams;

  if (typeof token !== "string" || token.trim().length === 0)
  {
    notFound();
  }

  const secreto = readEnv("CANCELACION_SECRET");

  if (secreto === null || secreto.trim().length < 16)
  {
    notFound();
  }

  try
  {
    verificarTokenCancelacion(token.trim(), secreto, new Date(), turnoId);
  }
  catch
  {
    notFound();
  }

  let resumen: {
    negocio: string; servicio: string; profesional: string; fecha: string;
    estado: string; horasRestantes: number; retencionHs: number; seDevuelve: boolean;
  } | null = null;

  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("turnos")
      .select("id, estado, inicio, cliente_id," +
        " negocio:negocios(nombre, timezone, pais, sena_retencion_hs)," +
        " servicio:servicios(nombre, reembolso_auto), staff:staff(nombre)")
      .eq("id", turnoId).single();

    if (data !== null)
    {
      const row = data as unknown as {
        estado: string; inicio: string;
        negocio: { nombre?: string; timezone?: unknown; pais?: unknown; sena_retencion_hs?: unknown } | null;
        servicio: { nombre?: string; reembolso_auto?: unknown } | null;
        staff: { nombre?: string } | null;
      };
      const timeZone = resolverTimezoneNegocio({
        timezone: row.negocio?.timezone, pais: row.negocio?.pais,
      });
      const inicio = new Date(row.inicio);
      const horasRestantes = Number.isNaN(inicio.getTime())
        ? 0
        : horasRestantesPara(inicio, new Date());
      const retencionHs = resolverRetencionHs(row.negocio?.sena_retencion_hs);

      resumen = {
        negocio: row.negocio?.nombre ?? "tu negocio",
        servicio: row.servicio?.nombre ?? "tu servicio",
        profesional: row.staff?.nombre ?? "tu profesional",
        fecha: formatearEnZona(inicio, timeZone),
        estado: row.estado,
        horasRestantes,
        retencionHs,
        seDevuelve: horasRestantes > retencionHs,
      };
    }
  }
  catch
  {
    resumen = null;
  }

  if (resumen === null)
  {
    notFound();
  }

  const yaCerrado = !["pendiente", "confirmado", "pagado"].includes(resumen.estado);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <h1 className="text-2xl font-bold text-slate-900 text-center">
            {`Cancelar turno en ${resumen.negocio}`}
          </h1>
          <p className="text-sm text-slate-600 text-center">
            {`${resumen.servicio} con ${resumen.profesional} · ${resumen.fecha}`}
          </p>
          {yaCerrado ? (
            <p className="text-sm text-slate-600 text-center">Ese turno ya está cerrado.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600 text-center">
                {resumen.seDevuelve
                  ? `Faltan ${Math.floor(resumen.horasRestantes)}hs: tu seña se devuelve automáticamente.`
                  : `Faltan ${Math.floor(Math.max(resumen.horasRestantes, 0))}hs ` +
                    `(dentro de las ${resumen.retencionHs}hs de retención): ` +
                    `el turno se cancela pero perdés la seña.`}
              </p>
              <FormularioCancelacion turnoId={turnoId} token={token} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
