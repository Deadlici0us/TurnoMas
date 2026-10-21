import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TOKEN = "diag-8f3c1a7b9e2d4f60";
const NEGOCIO_ID = "c12b7829-b60a-4e91-9a86-ff87017c3a60";
const STAFF_ID = "b408fe3f-db34-4708-8499-499d3411d40d";

export async function GET(request: Request): Promise<NextResponse>
{
  const token = new URL(request.url).searchParams.get("token");

  if (token !== TOKEN)
  {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const [{ data: turnos }, { data: servicios }] = await Promise.all([
    admin.from("turnos")
      .select("id, staff_id, servicio_id, inicio, fin, estado, created_at")
      .eq("negocio_id", NEGOCIO_ID)
      .eq("staff_id", STAFF_ID)
      .gte("inicio", "2026-10-20T00:00:00Z")
      .lt("inicio", "2026-10-23T00:00:00Z")
      .order("inicio"),
    admin.from("servicios").select("id, nombre, duracion_min").eq("negocio_id", NEGOCIO_ID),
  ]);

  return NextResponse.json({ turnos: turnos ?? [], servicios: servicios ?? [] });
}
