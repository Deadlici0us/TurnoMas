/**
 * Diagnóstico temporal de suscripciones.
 *
 * TEMPORAL: protegido por una clave efímera en el header `x-diag-key`.
 * Corre server-side con los tokens de plataforma para verificar:
 *  1. Crear el plan con payment_types válidos (incluye account_money).
 *  2. Tokenizar una tarjeta de prueba con la public key.
 *  3. Crear el preapproval con plan + card_token (authorized).
 *  4. PUT para dejar principal = account_money y secundario = la tarjeta.
 * Devuelve crudo lo que responde MercadoPago. Se elimina tras la verificación.
 */

import { NextResponse } from "next/server";

import { readEnv } from "@/lib/env/env";

const MP_API_BASE = "https://api.mercadopago.com";
const DIAG_KEY = "turnomas-diag-20261016";
const BACK_URL = "https://turno-mas.vercel.app/dashboard/facturacion";
const BUYER_EMAIL = "test_user_8350292155495661383@testuser.com";

/** Tarjeta de prueba Mastercard APRO (sandbox AR). */
const TEST_CARD = {
  card_number: "5031755734530604",
  security_code: "123",
  expiration_month: 11,
  expiration_year: 2030,
  cardholder: {
    name: "APRO",
    identification: { type: "DNI", number: "12345678" },
  },
};

interface MpCall
{
  readonly status: number;
  readonly body: unknown;
}

/** Hace una llamada a MP y devuelve status + body parseado. */
async function llamar(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<MpCall>
{
  const response = await fetch(`${MP_API_BASE}${path}`, {
    method,
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

/** Crea un card token de prueba con la public key (sin bearer). */
async function crearCardToken(publicKey: string): Promise<MpCall>
{
  const response = await fetch(`${MP_API_BASE}/v1/card_tokens?public_key=${publicKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_CARD),
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
  if (request.headers.get("x-diag-key") !== DIAG_KEY)
  {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const token = readEnv("MP_ACCESS_TOKEN");
  const publicKey = readEnv("NEXT_MP_PUBLIC_KEY");

  if (token === null)
  {
    return NextResponse.json({ error: "Falta configurar MP_ACCESS_TOKEN." }, { status: 503 });
  }

  if (readEnv("VERCEL_ENV") === "production")
  {
    return NextResponse.json({ error: "Diagnóstico deshabilitado en producción." }, { status: 403 });
  }

  const resultado: Record<string, unknown> = {
    env: readEnv("VERCEL_ENV") ?? "desconocido",
    publicKeyPresente: publicKey !== null,
  };

  const plan = await llamar("POST", "/preapproval_plan", token, {
    reason: "TurnoMas - Diagnostico",
    back_url: BACK_URL,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 14999,
      currency_id: "ARS",
    },
    payment_methods_allowed: {
      payment_types: [{ id: "account_money" }, { id: "credit_card" }, { id: "debit_card" }],
    },
  });

  resultado.plan = { status: plan.status };

  const planId = (plan.body as { id?: unknown } | null)?.id;

  if (typeof planId !== "string")
  {
    resultado.plan = plan;
    return NextResponse.json(resultado, { status: 200 });
  }

  resultado.planId = planId;

  if (publicKey === null)
  {
    return NextResponse.json(resultado, { status: 200 });
  }

  const cardToken = await crearCardToken(publicKey);
  resultado.cardToken = cardToken;

  const cardTokenId = (cardToken.body as { id?: unknown } | null)?.id;

  if (typeof cardTokenId !== "string")
  {
    return NextResponse.json(resultado, { status: 200 });
  }

  const pre = await llamar("POST", "/preapproval", token, {
    preapproval_plan_id: planId,
    reason: "TurnoMas - Diagnostico",
    external_reference: "negocio-diagnostico",
    payer_email: BUYER_EMAIL,
    card_token_id: cardTokenId,
    back_url: BACK_URL,
    status: "authorized",
  });

  resultado.preapprovalCreado = pre;

  const preId = (pre.body as { id?: unknown } | null)?.id;

  if (typeof preId !== "string")
  {
    return NextResponse.json(resultado, { status: 200 });
  }

  resultado.preapprovalGet = await llamar("GET", `/preapproval/${preId}`, token);

  resultado.preapprovalPutSaldo = await llamar("PUT", `/preapproval/${preId}`, token, {
    payment_method_id: "account_money",
    card_token_id_secondary: cardTokenId,
    payment_method_id_secondary: "master",
    status: "authorized",
  });

  resultado.preapprovalGetFinal = await llamar("GET", `/preapproval/${preId}`, token);

  return NextResponse.json(resultado, { status: 200 });
}
