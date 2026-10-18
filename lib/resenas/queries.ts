/**
 * Lectura de reseñas capturadas (canal privado) para el dashboard.
 *
 * Devuelve las reseñas del negocio con el nombre del cliente y el servicio,
 * más el conteo de pendientes (para el badge del sidebar). Best-effort: ante
 * error devuelve vacío para no romper la página.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface ResenaDashboard
{
  readonly id: string;
  readonly estrellas: number;
  readonly comentario: string | null;
  readonly resuelto: boolean;
  readonly fecha: string;
  readonly cliente: string;
  readonly whatsapp: string;
  readonly servicio: string;
}

type Fila = Record<string, unknown>;

/** Normaliza una fila cruda (con embeds) a `ResenaDashboard`. */
function mapResena(raw: unknown): ResenaDashboard | null
{
  if (typeof raw !== "object" || raw === null)
  {
    return null;
  }

  const fila = raw as Fila;

  if (typeof fila.id !== "string" || typeof fila.estrellas !== "number"
    || typeof fila.created_at !== "string")
  {
    return null;
  }

  const cliente = (fila.cliente ?? null) as Fila | null;
  const turno = (fila.turno ?? null) as Fila | null;
  const servicio = (turno?.servicio ?? null) as Fila | null;

  return {
    id: fila.id,
    estrellas: fila.estrellas,
    comentario: typeof fila.comentario === "string" ? fila.comentario : null,
    resuelto: fila.resuelto === true,
    fecha: fila.created_at,
    cliente: typeof cliente?.nombre === "string" && cliente.nombre.length > 0
      ? cliente.nombre
      : "Cliente",
    whatsapp: typeof cliente?.whatsapp === "string" ? cliente.whatsapp : "",
    servicio: typeof servicio?.nombre === "string" && servicio.nombre.length > 0
      ? servicio.nombre
      : "Servicio",
  };
}

/** Lista las reseñas del negocio, más recientes primero. */
export async function listarResenas(negocioId: string): Promise<ResenaDashboard[]>
{
  if (negocioId.trim().length === 0)
  {
    return [];
  }

  try
  {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("resenas")
      .select("id, estrellas, comentario, resuelto, created_at," +
        " cliente:clientes(nombre, whatsapp)," +
        " turno:turnos(servicio:servicios(nombre))")
      .eq("negocio_id", negocioId)
      .order("created_at", { ascending: false });

    return (Array.isArray(data) ? data : []).flatMap((raw) =>
    {
      const resena = mapResena(raw);

      return resena === null ? [] : [resena];
    });
  }
  catch
  {
    return [];
  }
}

/** Cuenta las reseñas pendientes de resolver (badge del sidebar). */
export async function contarResenasPendientes(negocioId: string): Promise<number>
{
  if (negocioId.trim().length === 0)
  {
    return 0;
  }

  try
  {
    const admin = getSupabaseAdmin();
    const { count } = await admin.from("resenas").select("*", { count: "exact", head: true })
      .eq("negocio_id", negocioId).eq("resuelto", false);

    return count ?? 0;
  }
  catch
  {
    return 0;
  }
}
