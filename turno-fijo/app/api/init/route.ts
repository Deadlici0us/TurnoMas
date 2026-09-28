/**
 * Seed inicial idempotente (plan §8): puebla la cuenta Demo permanente
 * solo cuando `negocios` está vacío. Llamar una vez tras el deploy:
 * `curl -X POST https://<app>/api/init`.
 *
 * Seguro de reintentar: verifica conteo previo e inserta con `upsert`
 * por id, así nunca duplica. Corre con service role (bypass RLS).
 */

import { NextResponse } from "next/server";

import { readEnv } from "@/lib/env/env";
import { buildDemoSeed } from "@/lib/seed/demo-rows";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MISSING_OWNER_MESSAGE = "Seed omitido: falta DEMO_DUENIO_ID en el entorno.";

export async function POST()
{
  const ownerId = readEnv("DEMO_DUENIO_ID");

  if (ownerId === null)
  {
    return NextResponse.json({ ok: false, seeded: false, error: MISSING_OWNER_MESSAGE }, { status: 400 });
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;

  try
  {
    admin = getSupabaseAdmin();
  }
  catch
  {
    return NextResponse.json(
      { ok: false, seeded: false, error: "Seed omitido: falta configuración de Supabase." },
      { status: 500 },
    );
  }

  const { count, error: countError } = await admin
    .from("negocios")
    .select("id", { count: "exact", head: true });

  if (countError)
  {
    return NextResponse.json(
      { ok: false, seeded: false, error: "No se pudo verificar si la base ya estaba poblada." },
      { status: 500 },
    );
  }

  if ((count ?? 0) > 0)
  {
    return NextResponse.json({ ok: true, seeded: false, reason: "La base ya estaba poblada." });
  }

  const seed = buildDemoSeed(ownerId);

  const inserts = [
    admin.from("negocios").upsert(seed.negocio, { onConflict: "id" }),
    admin.from("staff").upsert([...seed.staff], { onConflict: "id" }),
    admin.from("servicios").upsert([...seed.servicios], { onConflict: "id" }),
    admin.from("clientes").upsert([...seed.clientes], { onConflict: "id" }),
    admin.from("turnos").upsert([...seed.turnos], { onConflict: "id" }),
  ];

  const results = await Promise.all(inserts);
  const failed = results.find((result) => result.error !== null);

  if (failed?.error)
  {
    return NextResponse.json(
      { ok: false, seeded: false, error: "No se pudo poblar la cuenta demo. Reintentá el seed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, seeded: true });
}
