/**
 * Persistencia Supabase de promociones del plan.
 *
 * Usa service role porque el panel admin escribe fuera del alcance RLS del
 * dueño. La lectura pública para el dashboard pasa por RLS, pero el server
 * component también puede usar este repositorio.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import type {
  GuardarPromocionInput,
  NegocioPlan,
  Promocion,
  PromocionRepositorio,
} from "./promociones";

const LIMITE_LISTADO = 500;

/** Indica si el error corresponde a una migración aún no aplicada. */
function esTablaAusente(error: { code?: string; message?: string }): boolean
{
  return error.code === "42P01"
    || error.code === "PGRST205"
    || (error.message?.includes("does not exist") ?? false);
}

/** Convierte una fila cruda en una promoción válida o null. */
function normalizarPromocion(raw: unknown): Promocion | null
{
  if (typeof raw !== "object" || raw === null)
  {
    return null;
  }

  const fila = raw as Record<string, unknown>;

  if (typeof fila.id !== "string"
    || typeof fila.negocio_id !== "string"
    || typeof fila.porcentaje !== "number"
    || typeof fila.vigente_desde !== "string"
    || typeof fila.vigente_hasta !== "string"
    || typeof fila.activo !== "boolean"
    || typeof fila.created_by !== "string")
  {
    return null;
  }

  return {
    id: fila.id,
    negocioId: fila.negocio_id,
    porcentaje: fila.porcentaje,
    motivo: typeof fila.motivo === "string" ? fila.motivo : null,
    vigenteDesde: fila.vigente_desde,
    vigenteHasta: fila.vigente_hasta,
    activo: fila.activo,
    sincronizadoEn: typeof fila.sincronizado_en === "string" ? fila.sincronizado_en : null,
    ultimoError: typeof fila.ultimo_error === "string" ? fila.ultimo_error : null,
    createdBy: fila.created_by,
  };
}

/** Convierte una fila cruda de negocio a la forma del dominio. */
function normalizarNegocio(raw: unknown): NegocioPlan | null
{
  if (typeof raw !== "object" || raw === null)
  {
    return null;
  }

  const fila = raw as Record<string, unknown>;

  if (typeof fila.id !== "string"
    || typeof fila.nombre !== "string"
    || typeof fila.slug !== "string"
    || typeof fila.duenio_id !== "string")
  {
    return null;
  }

  return {
    id: fila.id,
    nombre: fila.nombre,
    slug: fila.slug,
    pais: typeof fila.pais === "string" ? fila.pais : null,
    duenioId: fila.duenio_id,
    suscripcionMpId: typeof fila.suscripcion_mp_id === "string" ? fila.suscripcion_mp_id : null,
    suscripcionEstado: typeof fila.suscripcion_estado === "string"
      ? fila.suscripcion_estado
      : null,
  };
}

export class SupabasePromocionRepositorio implements PromocionRepositorio
{
  /**
   * Busca la promo activa dentro de su ventana.
   *
   * @param negocioId ID del negocio.
   * @param ahora Momento de referencia.
   * @return Promo vigente o null.
   */
  async obtenerVigente(negocioId: string, ahora: Date): Promise<Promocion | null>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("promociones_suscripcion")
      .select("*")
      .eq("negocio_id", negocioId)
      .eq("activo", true)
      .lte("vigente_desde", ahora.toISOString())
      .gt("vigente_hasta", ahora.toISOString())
      .maybeSingle();

    if (error !== null)
    {
      if (esTablaAusente(error))
      {
        return null;
      }

      throw new Error("No pudimos cargar la promoción del plan.");
    }

    return normalizarPromocion(data);
  }

  /**
   * Busca cualquier promo del negocio, activa o vencida.
   *
   * @param negocioId ID del negocio.
   * @return Promo o null.
   */
  async obtenerPorNegocio(negocioId: string): Promise<Promocion | null>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("promociones_suscripcion")
      .select("*")
      .eq("negocio_id", negocioId)
      .maybeSingle();

    if (error !== null)
    {
      if (esTablaAusente(error))
      {
        return null;
      }

      throw new Error("No pudimos cargar la promoción del plan.");
    }

    return normalizarPromocion(data);
  }

  /**
   * Inserta o actualiza la promo del negocio (una fila por negocio).
   *
   * @param input Fila a persistir.
   * @return Promo guardada.
   */
  async guardar(input: GuardarPromocionInput): Promise<Promocion>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("promociones_suscripcion")
      .upsert({
        negocio_id: input.negocioId,
        porcentaje: input.porcentaje,
        motivo: input.motivo,
        vigente_desde: input.vigenteDesde,
        vigente_hasta: input.vigenteHasta,
        activo: input.activo,
        created_by: input.createdBy,
        sincronizado_en: null,
        ultimo_error: null,
      }, { onConflict: "negocio_id" })
      .select("*")
      .single();

    if (error !== null)
    {
      throw new Error("No pudimos guardar la promoción del plan.");
    }

    const promocion = normalizarPromocion(data);

    if (promocion === null)
    {
      throw new Error("La promoción guardada no tiene un formato válido.");
    }

    return promocion;
  }

  /**
   * Marca la promo como inactiva sin borrarla.
   *
   * @param negocioId ID del negocio.
   */
  async desactivar(negocioId: string): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("promociones_suscripcion")
      .update({ activo: false, sincronizado_en: null })
      .eq("negocio_id", negocioId);

    if (error !== null && !esTablaAusente(error))
    {
      throw new Error("No pudimos terminar la promoción del plan.");
    }
  }

  /**
   * Guarda el resultado de sincronizar con MercadoPago.
   *
   * @param negocioId ID del negocio.
   * @param sincronizadoEn Momento del éxito o null si falló.
   * @param ultimoError Mensaje de error o null si salió bien.
   */
  async marcarSincronizacion(
    negocioId: string,
    sincronizadoEn: Date | null,
    ultimoError: string | null,
  ): Promise<void>
  {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("promociones_suscripcion")
      .update({
        sincronizado_en: sincronizadoEn?.toISOString() ?? null,
        ultimo_error: ultimoError,
      })
      .eq("negocio_id", negocioId);

    if (error !== null && !esTablaAusente(error))
    {
      throw new Error("No pudimos registrar la sincronización de la promoción.");
    }
  }

  /**
   * Lee los datos del negocio necesarios para calcular el plan.
   *
   * @param negocioId ID del negocio.
   * @return Negocio o null si no existe.
   */
  async obtenerNegocio(negocioId: string): Promise<NegocioPlan | null>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("negocios")
      .select("id, nombre, slug, pais, duenio_id, suscripcion_mp_id, suscripcion_estado")
      .eq("id", negocioId)
      .maybeSingle();

    if (error !== null)
    {
      throw new Error("No pudimos cargar el negocio de la promoción.");
    }

    return normalizarNegocio(data);
  }

  /**
   * Lista los negocios para el panel admin.
   *
   * @return Negocios ordenados por nombre.
   */
  async listarNegocios(): Promise<NegocioPlan[]>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("negocios")
      .select("id, nombre, slug, pais, duenio_id, suscripcion_mp_id, suscripcion_estado")
      .order("nombre", { ascending: true })
      .limit(LIMITE_LISTADO);

    if (error !== null)
    {
      throw new Error("No pudimos listar los negocios.");
    }

    return (Array.isArray(data) ? data : []).flatMap((fila) =>
    {
      const negocio = normalizarNegocio(fila);

      return negocio === null ? [] : [negocio];
    });
  }

  /**
   * Lista todas las promociones (activas y vencidas).
   *
   * @return Promociones normalizadas.
   */
  async listarPromociones(): Promise<Promocion[]>
  {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("promociones_suscripcion")
      .select("*")
      .limit(LIMITE_LISTADO);

    if (error !== null)
    {
      if (esTablaAusente(error))
      {
        return [];
      }

      throw new Error("No pudimos listar las promociones.");
    }

    return (Array.isArray(data) ? data : []).flatMap((fila) =>
    {
      const promocion = normalizarPromocion(fila);

      return promocion === null ? [] : [promocion];
    });
  }
}
