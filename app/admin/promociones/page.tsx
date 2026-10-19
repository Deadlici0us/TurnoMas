import type { ReactNode } from "react";
import Link from "next/link";

import PageHeader from "@/components/ui/page-header";
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
    <div className="min-h-screen bg-surface text-ink ">
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Promociones del plan"
          subtitle="Descuentos porcentuales con vencimiento. Se sincronizan con MercadoPago."
          actions={<Link href="/dashboard" className="ui-btn ui-btn-outline">Volver</Link>}
        />

        {params?.ok !== undefined && (
          <p className="ui-alert ui-alert-success mb-4 text-xs font-semibold">
            Promoción actualizada.
          </p>
        )}

        {params?.error !== undefined && params.error.length > 0 && (
          <p className="ui-alert ui-alert-danger mb-4 text-xs font-semibold">
            {`Se guardó la promo, pero MercadoPago no confirmó la sincronización: ${params.error}`}
          </p>
        )}

        <div className="ui-card overflow-x-auto">
          <table className="ui-table min-w-[980px]">
            <thead>
              <tr>
                <th className="ui-th">Negocio</th>
                <th className="ui-th">Plan</th>
                <th className="ui-th">Promo</th>
                <th className="ui-th">Aplicar / extender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filas.map((fila, indice) => (
                <tr key={fila.negocio.id} className="ui-tr align-top">
                  <td className="ui-td">
                    <p className="font-semibold text-ink">{fila.negocio.nombre}</p>
                    <p className="text-xs text-muted-foreground">/{fila.negocio.slug}</p>
                    <p className="text-xs text-muted-foreground">{emails[indice] ?? fila.negocio.duenioId}</p>
                  </td>
                  <td className="ui-td tabular-nums">
                    {fila.precio.aplicada ? (
                      <div>
                        <p className="text-xs text-muted-foreground line-through">
                          {formatearPrecio(fila.plan.currency, fila.precio.montoBase)}
                        </p>
                        <p className="font-semibold text-[#0c6b45]">
                          {formatearPrecio(fila.plan.currency, fila.precio.montoFinal)}
                          <span className="text-xs text-muted-foreground">/mes</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-ink">
                        {formatearPrecio(fila.plan.currency, fila.precio.montoFinal)}
                        <span className="text-xs text-muted-foreground">/mes</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {fila.negocio.suscripcionEstado ?? "sin plan"}
                    </p>
                  </td>
                  <td className="ui-td">
                    <p className="text-ink">{estadoPromo(fila)}</p>
                    {fila.promocion !== null && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Hasta {formatearFecha(fila.promocion.vigenteHasta)}
                        </p>
                        {fila.promocion.ultimoError !== null && (
                          <p className="mt-1 max-w-[220px] text-xs text-danger">
                            {`Sync: ${fila.promocion.ultimoError}`}
                          </p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="ui-td">
                    <form action={aplicarPromocion} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="negocioId" value={fila.negocio.id} />
                      <label className="text-xs text-muted-foreground">
                        <span className="mb-1 block">%</span>
                        <input
                          type="number"
                          name="porcentaje"
                          min={1}
                          max={99}
                          required
                          defaultValue={fila.promocion?.porcentaje ?? 20}
                          className="ui-input w-20 px-2"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        <span className="mb-1 block">Meses</span>
                        <select
                          name="meses"
                          defaultValue={3}
                          className="ui-select px-2"
                        >
                          {MESES_OPCIONES.map((mes) => (
                            <option key={mes} value={mes}>{mes}</option>
                          ))}
                        </select>
                      </label>
                      <label className="min-w-[150px] flex-1 text-xs text-muted-foreground">
                        <span className="mb-1 block">Motivo</span>
                        <input
                          type="text"
                          name="motivo"
                          maxLength={200}
                          defaultValue={fila.promocion?.motivo ?? ""}
                          placeholder="Ej: lanzamiento"
                          className="ui-input px-2"
                        />
                      </label>
                      <button
                        type="submit"
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        Guardar
                      </button>
                    </form>

                    {fila.promocion?.activo === true && (
                      <form action={finalizarPromocion} className="mt-2">
                        <input type="hidden" name="negocioId" value={fila.negocio.id} />
                        <button
                          type="submit"
                          className="ui-btn ui-btn-danger ui-btn-sm"
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
          <p className="mt-4 text-sm text-muted-foreground">Todavía no hay negocios registrados.</p>
        )}
      </div>
    </div>
  );
}
