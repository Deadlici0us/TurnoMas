import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdminEmail } from "@/lib/auth/admin";
import { promocionService, type PromocionAdmin } from "@/lib/services/promociones";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

import { aplicarPromocion, finalizarPromocion } from "./actions";

export const dynamic = "force-dynamic";

const MESES_OPCIONES = [1, 3, 6, 12] as const;

interface AdminPageProps
{
  readonly searchParams?: Promise<{ ok?: string; error?: string }>;
}

/**
 * Formatea un monto del plan (unidades de moneda, no centavos).
 *
 * @param currency Moneda ISO (ARS/USD).
 * @param monto Monto mensual.
 * @return Precio legible en es-AR.
 */
function formatearPrecio(currency: string, monto: number): string
{
  try
  {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(monto);
  }
  catch
  {
    return `${monto} ${currency}`;
  }
}

/**
 * Formatea una fecha ISO en es-AR.
 *
 * @param iso Fecha ISO.
 * @return Fecha corta o "—".
 */
function formatearFecha(iso: string | null): string
{
  if (iso === null)
  {
    return "—";
  }

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime()))
  {
    return "—";
  }

  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

/**
 * Busca el email del dueño para mostrarlo en el panel.
 *
 * @param duenioId UID de Supabase Auth.
 * @return Email o null si no se pudo resolver.
 */
async function emailDuenio(duenioId: string): Promise<string | null>
{
  try
  {
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(duenioId);

    if (error !== null)
    {
      return null;
    }

    return data.user?.email ?? null;
  }
  catch
  {
    return null;
  }
}

/**
 * Estado legible de la promo para la tabla.
 *
 * @param fila Negocio con promo y precios calculados.
 * @return Etiqueta corta.
 */
function estadoPromo(fila: PromocionAdmin): string
{
  if (fila.promocion === null)
  {
    return "Sin promo";
  }

  if (fila.precio.aplicada)
  {
    return `Activa ${fila.promocion.porcentaje}%`;
  }

  return fila.promocion.activo ? "Fuera de ventana" : "Vencida";
}

/**
 * Panel mínimo para asignar, extender y terminar promos del plan.
 *
 * @param props Parámetros de la URL (`ok`/`error`).
 */
export default async function AdminPromocionesPage(props: AdminPageProps): Promise<ReactNode>
{
  const supabase = await getSupabaseServer().catch(() => null);
  const user = supabase === null ? null : (await supabase.auth.getUser()).data.user;

  if (user === null || !isAdminEmail(user.email))
  {
    notFound();
  }

  const params = props.searchParams === undefined ? undefined : await props.searchParams;
  const filas = await promocionService.listarParaAdmin();
  const emails = await Promise.all(filas.map((fila) => emailDuenio(fila.negocio.duenioId)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 scheme-dark">
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promociones del plan</h1>
            <p className="mt-1 text-sm text-slate-400">
              Descuentos porcentuales con vencimiento. Se sincronizan con MercadoPago.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/15 px-4 py-2 text-slate-300 hover:bg-white/10"
          >
            Volver
          </Link>
        </div>

        {params?.ok !== undefined && (
          <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs
            font-semibold text-emerald-300">
            Promoción actualizada.
          </p>
        )}

        {params?.error !== undefined && params.error.length > 0 && (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs
            font-semibold text-rose-300">
            {`Se guardó la promo, pero MercadoPago no confirmó la sincronización: ${params.error}`}
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="px-4 py-3 font-semibold">Negocio</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Promo</th>
                <th className="px-4 py-3 font-semibold">Aplicar / extender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filas.map((fila, indice) => (
                <tr key={fila.negocio.id} className="align-top hover:bg-white/5">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-100">{fila.negocio.nombre}</p>
                    <p className="text-xs text-slate-400">/{fila.negocio.slug}</p>
                    <p className="text-xs text-slate-500">{emails[indice] ?? fila.negocio.duenioId}</p>
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {fila.precio.aplicada ? (
                      <div>
                        <p className="text-xs text-slate-500 line-through">
                          {formatearPrecio(fila.plan.currency, fila.precio.montoBase)}
                        </p>
                        <p className="font-semibold text-emerald-300">
                          {formatearPrecio(fila.plan.currency, fila.precio.montoFinal)}
                          <span className="text-xs text-slate-400">/mes</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-200">
                        {formatearPrecio(fila.plan.currency, fila.precio.montoFinal)}
                        <span className="text-xs text-slate-400">/mes</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {fila.negocio.suscripcionEstado ?? "sin plan"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-slate-300">{estadoPromo(fila)}</p>
                    {fila.promocion !== null && (
                      <>
                        <p className="text-xs text-slate-400">
                          Hasta {formatearFecha(fila.promocion.vigenteHasta)}
                        </p>
                        {fila.promocion.ultimoError !== null && (
                          <p className="mt-1 max-w-[220px] text-xs text-rose-300">
                            {`Sync: ${fila.promocion.ultimoError}`}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <form action={aplicarPromocion} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="negocioId" value={fila.negocio.id} />
                      <label className="text-xs text-slate-400">
                        <span className="mb-1 block">%</span>
                        <input
                          type="number"
                          name="porcentaje"
                          min={1}
                          max={99}
                          required
                          defaultValue={fila.promocion?.porcentaje ?? 20}
                          className="w-20 rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1.5
                            text-slate-100 outline-none focus:border-brand-500"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        <span className="mb-1 block">Meses</span>
                        <select
                          name="meses"
                          defaultValue={3}
                          className="rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1.5
                            text-slate-100 outline-none focus:border-brand-500"
                        >
                          {MESES_OPCIONES.map((mes) => (
                            <option key={mes} value={mes}>{mes}</option>
                          ))}
                        </select>
                      </label>
                      <label className="min-w-[150px] flex-1 text-xs text-slate-400">
                        <span className="mb-1 block">Motivo</span>
                        <input
                          type="text"
                          name="motivo"
                          maxLength={200}
                          defaultValue={fila.promocion?.motivo ?? ""}
                          placeholder="Ej: lanzamiento"
                          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1.5
                            text-slate-100 outline-none focus:border-brand-500"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white
                          hover:bg-brand-500"
                      >
                        Guardar
                      </button>
                    </form>

                    {fila.promocion?.activo === true && (
                      <form action={finalizarPromocion} className="mt-2">
                        <input type="hidden" name="negocioId" value={fila.negocio.id} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                        >
                          Terminar promo
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filas.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">Todavía no hay negocios registrados.</p>
        )}
      </div>
    </div>
  );
}
