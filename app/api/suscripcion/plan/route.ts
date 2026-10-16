/**
 * Provisiona (una sola vez) el plan de suscripción en MercadoPago.
 *
 * Operación de administración protegida por `MP_PLAN_ADMIN_SECRET`: crea el
 * `preapproval_plan` de AR y devuelve su `id` para guardarlo en
 * `MP_PLAN_ID_AR`. No es un endpoint público atado al comprador.
 */

import { NextResponse } from "next/server";

import { readEnv } from "@/lib/env/env";
import { crearPlanPreapproval, resolverPlanPais } from "@/lib/payments/subscription";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";

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

  const platformToken = readEnv("MP_ACCESS_TOKEN");

  if (platformToken === null)
  {
    return NextResponse.json({ error: "Falta configurar MP_ACCESS_TOKEN." }, { status: 503 });
  }

  const publicUrl = readEnv("NEXT_PUBLIC_APP_URL");
  const vercelUrl = readEnv("VERCEL_URL");
  const base = publicUrl ?? (vercelUrl !== null ? `https://${stripTrailingSlashes(vercelUrl)}` : null);

  if (base === null)
  {
    return NextResponse.json({ error: "No pudimos resolver la URL pública." }, { status: 500 });
  }

  const plan = resolverPlanPais("ar");

  try
  {
    const creado = await crearPlanPreapproval({
      reason: "TurnoMas - Plan mensual",
      backUrl: `${stripTrailingSlashes(base)}/dashboard/facturacion`,
      monto: plan.monto,
      currency: plan.currency,
      platformToken,
    });

    return NextResponse.json({ id: creado.id }, { status: 201 });
  }
  catch (error)
  {
    console.error("[suscripcion/plan]", error);

    return NextResponse.json({ error: "No pudimos crear el plan." }, { status: 502 });
  }
}
