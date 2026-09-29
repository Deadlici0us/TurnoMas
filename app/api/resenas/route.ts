/**
 * Recepción de reseñas (Módulo 5, Recolector de Reseñas).
 *
 * `POST { turnoId, estrellas, comentario? }`: 4-5 estrellas derivan a
 * Google Maps; 1-3 guardan feedback interno en la ficha del cliente.
 */

import { NextResponse } from "next/server";

import { resolveReviewDestination } from "@/lib/automations/resenas";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function mapsUrl(negocio: string): string
{
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(negocio)}`;
}

export async function POST(request: Request)
{
  let body: { turnoId?: unknown; estrellas?: unknown; comentario?: unknown };

  try
  {
    body = (await request.json()) as typeof body;
  }
  catch
  {
    return NextResponse.json({ error: "No pudimos leer tu calificación." }, { status: 400 });
  }

  if (typeof body.turnoId !== "string" || body.turnoId.trim().length === 0)
  {
    return NextResponse.json({ error: "Falta el turno a calificar." }, { status: 400 });
  }

  if (typeof body.estrellas !== "number")
  {
    return NextResponse.json({ error: "Elegí de 1 a 5 estrellas." }, { status: 400 });
  }

  let destino: ReturnType<typeof resolveReviewDestination>;

  try
  {
    destino = resolveReviewDestination(body.estrellas);
  }
  catch
  {
    return NextResponse.json({ error: "Elegí de 1 a 5 estrellas." }, { status: 400 });
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;

  try
  {
    admin = getSupabaseAdmin();
  }
  catch
  {
    return NextResponse.json({ error: "Calificación no disponible ahora." }, { status: 503 });
  }

  const { data: turno } = await admin.from("turnos")
    .select("id, estado, cliente_id, negocio:negocios(nombre)")
    .eq("id", body.turnoId.trim()).single();

  if (turno === null)
  {
    return NextResponse.json({ error: "No encontramos ese turno." }, { status: 404 });
  }

  const turnoRow = turno as unknown as {
    estado: string; cliente_id: string; negocio: { nombre: string } | null;
  };
  const nombreNegocio = turnoRow.negocio?.nombre ?? "tu negocio";

  await admin.from("turnos").update({ resena_pedida: true }).eq("id", body.turnoId.trim());

  if (destino === "google-maps")
  {
    return NextResponse.json({ success: true, destino, mapsUrl: mapsUrl(nombreNegocio) });
  }

  const comentario = typeof body.comentario === "string" ? body.comentario.trim().slice(0, 500) : "";

  try
  {
    const { data: cliente } = await admin.from("clientes").select("notas")
      .eq("id", turnoRow.cliente_id).single();
    const previas = (cliente as { notas?: unknown } | null)?.notas;
    const linea = `[Reseña ${body.estrellas}/5]${comentario.length > 0 ? ` ${comentario}` : ""}`;
    const notas = typeof previas === "string" && previas.length > 0 ? `${previas}\n${linea}` : linea;

    await admin.from("clientes").update({ notas }).eq("id", turnoRow.cliente_id);
  }
  catch
  {
    // Best-effort: la calificación ya quedó registrada como pedida.
  }

  return NextResponse.json({ success: true, destino });
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
