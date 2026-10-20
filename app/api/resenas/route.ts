/**
 * Feedback privado de reseñas (Módulo 5, canal interno de la Opción B).
 *
 * `POST { turnoId, estrellas, comentario? }`: guarda el feedback del cliente
 * en la tabla `resenas`. El link a Google se ofrece en el email para todos
 * (sin gating); esta ruta es solo el canal privado opcional.
 */

import { NextResponse } from "next/server";

import { esEstrellasValidas } from "@/lib/automations/resenas";
import { DEMO_NEGOCIO_ID } from "@/lib/portal/demo-business";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

  if (!esEstrellasValidas(body.estrellas))
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

  const turnoId = body.turnoId.trim();
  const { data: turno } = await admin.from("turnos")
    .select("id, negocio_id, cliente_id")
    .eq("id", turnoId).single();

  if (turno === null)
  {
    return NextResponse.json({ error: "No encontramos ese turno." }, { status: 404 });
  }

  const turnoRow = turno as unknown as { negocio_id: string; cliente_id: string };

  // La demo no persiste reseñas ni marcas sobre turnos.
  if (turnoRow.negocio_id === DEMO_NEGOCIO_ID)
  {
    return NextResponse.json({ success: true, demo: true });
  }

  const comentario = typeof body.comentario === "string"
    ? body.comentario.trim().slice(0, 500)
    : "";

  // Idempotente: una fila por turno (reintentos actualizan la misma).
  const { error } = await admin.from("resenas").upsert({
    negocio_id: turnoRow.negocio_id,
    turno_id: turnoId,
    cliente_id: turnoRow.cliente_id,
    estrellas: body.estrellas,
    comentario: comentario.length > 0 ? comentario : null,
    destino: "feedback-interno",
  }, { onConflict: "turno_id" });

  if (error !== null)
  {
    return NextResponse.json({ error: "No pudimos guardar tu calificación." }, { status: 502 });
  }

  await admin.from("turnos").update({ resena_pedida: true }).eq("id", turnoId);

  return NextResponse.json({ success: true });
}

export async function GET()
{
  return NextResponse.json({ status: "ok" });
}
