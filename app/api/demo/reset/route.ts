import { NextResponse } from "next/server";

import { isDemoOwner } from "@/lib/auth/demo-guard";
import { reseedDemoBusiness } from "@/lib/demo/reseed";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Reinicia la cuenta demo a los datos iniciales.
 * Solo el dueño demo autenticado puede llamarlo.
 */
export async function POST()
{
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  if (!isDemoOwner({ userId: user.id, email: user.email ?? null }))
  {
    return NextResponse.json({ ok: false, error: "Solo la cuenta demo." }, { status: 403 });
  }

  try
  {
    await reseedDemoBusiness(user.id);
  }
  catch
  {
    return NextResponse.json(
      { ok: false, error: "No pudimos restablecer la demo. Probá de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, reset: true });
}
