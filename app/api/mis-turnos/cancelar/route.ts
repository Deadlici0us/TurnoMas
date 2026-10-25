/**
 * Cancelación pública del cliente (link mágico por email/WhatsApp).
 *
 * `POST { turnoId, token }`: verifica HMAC (expira al inicio del turno),
 * cancela con el servicio compartido y devuelve el resultado del reembolso.
 * Rate-limit best-effort por turno en `turno_eventos`.
 */

import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/with-api-handler";

import { verificarTokenCancelacion } from "@/lib/cancelacion/token";
import { readEnv } from "@/lib/env/env";
import { cancelarTurno, CancelacionError, hashIp } from "@/lib/services/cancelacion";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const LIMITE_INTENTOS = 10;
const VENTANA_INTENTOS_MS = 60_000;

function secretoCancelacion(): string | null
{
  const secreto = readEnv("CANCELACION_SECRET");

  return secreto !== null && secreto.trim().length >= 16 ? secreto : null;
}

function ipDelRequest(request: Request): string | null
{
  const directa = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (typeof directa === "string" && directa.length > 0)
  {
    return directa;
  }

  const real = request.headers.get("x-real-ip")?.trim();

  return typeof real === "string" && real.length > 0 ? real : null;
}

/** Rate-limit best-effort: max N intentos por turno en la ventana. */
async function superaLimite(turnoId: string): Promise<boolean>
{
  try
  {
    const admin = getSupabaseAdmin();
    const desde = new Date(Date.now() - VENTANA_INTENTOS_MS).toISOString();
    const { data, error } = await admin.from("turno_eventos")
      .select("id").eq("turno_id", turnoId).gte("created_at", desde)
      .limit(LIMITE_INTENTOS + 1);

    if (error !== null || !Array.isArray(data))
    {
      return false;
    }

    return data.length > LIMITE_INTENTOS;
  }
  catch
  {
    return false;
  }
}

async function handlePOST(request: Request)
{
  let body: { turnoId?: unknown; token?: unknown };

  try
  {
    body = (await request.json()) as typeof body;
  }
  catch
  {
    return NextResponse.json({ error: "No pudimos leer tu cancelación. Probá de nuevo." }, { status: 400 });
  }

  if (typeof body.turnoId !== "string" || body.turnoId.trim().length === 0
    || typeof body.token !== "string" || body.token.trim().length === 0)
  {
    return NextResponse.json({ error: "Falta el turno o el link de cancelación." }, { status: 400 });
  }

  const secreto = secretoCancelacion();

  if (secreto === null)
  {
    return NextResponse.json({ error: "Cancelación no disponible ahora." }, { status: 503 });
  }

  const turnoId = body.turnoId.trim();

  try
  {
    verificarTokenCancelacion(body.token.trim(), secreto, new Date(), turnoId);
  }
  catch (error)
  {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "El link de cancelación no es válido." },
      { status: 401 },
    );
  }

  if (await superaLimite(turnoId))
  {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto y probá de nuevo." },
      { status: 429 },
    );
  }

  try
  {
    const resultado = await cancelarTurno({
      turnoId,
      actor: "cliente",
      ipHash: hashIp(ipDelRequest(request)),
    });

    return NextResponse.json({ success: true, ...resultado });
  }
  catch (error)
  {
    if (error instanceof CancelacionError)
    {
      return NextResponse.json(
        { error: error.message, codigo: error.codigo },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "No pudimos cancelar el turno. Probá de nuevo." }, { status: 500 });
  }
}

async function handleGET()
{
  return NextResponse.json({ status: "ok" });
}

export const GET = withApiHandler("/app/api/mis-turnos/cancelar", handleGET);
export const POST = withApiHandler("/app/api/mis-turnos/cancelar", handlePOST);
