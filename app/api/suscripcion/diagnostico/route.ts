/**
 * Diagnóstico temporal de suscripciones (protegido por MP_PLAN_ADMIN_SECRET).
 *
 * Corre server-side con el `MP_ACCESS_TOKEN` de la plataforma para verificar
 * si MercadoPago acepta un preapproval CON PLAN en estado `pending` (sin
 * `card_token_id`) y devuelve `init_point` — clave para permitir pagar con
 * saldo en cuenta. Devuelve crudo lo que responde MP.
 */

import { NextResponse } from "next/server";

import { readEnv } from "@/lib/env/env";

const MP_API_BASE = "https://api.mercadopago.com";

interface MpCall
{
  readonly status: number;
  readonly body: unknown;
}

/** Hace una llamada a MP y devuelve status + body parseado. */
async function llamar(path: string, token: string, body?: unknown): Promise<MpCall>
{
  const response = await fetch(`${MP_API_BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const texto = await response.text();

  let parseado: unknown = texto;

  try
  {
    parseado = JSON.parse(texto);
  }
  catch
  {
    parseado = texto;
  }

  return { status: response.status, body: parseado };
}

export async function POST(request: Request)
{
  const secret = readEnv("MP_PLAN_ADMIN_SECRET");

  if (secret === null)
  {
    return NextResponse.json({ error: "Administración no configurada." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`)
  {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const token = readEnv("MP_ACCESS_TOKEN");

  if (token === null)
  {
    return NextResponse.json({ error: "Falta configurar MP_ACCESS_TOKEN." }, { status: 503 });
  }

  const resultado: Record<string, unknown> = {};

  resultado.collector = await llamar("/users/me", token);

  const plan = await llamar("/preapproval_plan", token, {
    reason: "TurnoMas - Diagnostico",
    back_url: "https://turno-mas.vercel.app/dashboard/facturacion",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 14999,
      currency_id: "ARS",
    },
    payment_methods_allowed: { payment_types: [{}], payment_methods: [{}] },
  });

  resultado.plan = plan;

  const planId = (plan.body as { id?: unknown } | null)?.id;

  if (typeof planId === "string")
  {
    for (const status of ["pending", "authorized"])
    {
      resultado[`preapproval_${status}`] = await llamar("/preapproval", token, {
        preapproval_plan_id: planId,
        reason: "TurnoMas - Diagnostico",
        external_reference: "negocio-diagnostico",
        back_url: "https://turno-mas.vercel.app/dashboard/facturacion",
        status,
      });
    }
  }

  return NextResponse.json(resultado, { status: 200 });
}
