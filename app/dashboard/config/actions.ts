"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { validarNombreNegocio } from "@/lib/negocios/validation";
import { isValidMpTokenFormat, verifyMpToken } from "@/lib/payments/mp-token";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

const PENALIDADES = ["blocked", "fullDeposit"] as const;

export type PenalidadListaNegra = (typeof PENALIDADES)[number];

/** Actualiza el umbral y la penalidad de lista negra del negocio del dueño. */
export async function actualizarPoliticaListaNegra(umbral: number, penalidad: PenalidadListaNegra): Promise<void>
{
  if (!Number.isInteger(umbral) || umbral < 1 || umbral > 10)
  {
    throw new RangeError("El umbral debe ser un entero entre 1 y 10.");
  }

  if (!PENALIDADES.includes(penalidad))
  {
    throw new RangeError("Esa penalidad no existe.");
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ blacklist_umbral: umbral, blacklist_penalidad: penalidad }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new Error("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Guarda el access token de MercadoPago del dueño (cobro de señas delegadas). */
export async function conectarMercadoPago(token: string): Promise<void>
{
  const value = token.trim();

  if (!isValidMpTokenFormat(value))
  {
    throw new RangeError("Ese token no parece válido. Revisalo y probá de nuevo.");
  }

  if (!(await verifyMpToken(value)))
  {
    throw new Error("MercadoPago rechazó ese token. Revisalo y probá de nuevo.");
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para conectar MercadoPago.");
  }

  // La demo puede guardar su token de MP; si es local, no se almacena persistentemente.


  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const { error } = await admin.from("negocio_secretos").upsert({
    negocio_id: negocio.id as string,
    mercadopago_access_token: value,
  }, { onConflict: "negocio_id" });

  if (error !== null)
  {
    throw new Error("No pudimos guardar el token. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Desconecta MercadoPago (las reservas pasan a confirmación manual). */
export async function desconectarMercadoPago(): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para desconectar MercadoPago.");
  }

  // Permitir que la demo modifique su conexión de MP.


  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const { error } = await admin.from("negocio_secretos")
    .update({ mercadopago_access_token: null }).eq("negocio_id", negocio.id as string);

  if (error !== null)
  {
    throw new Error("No pudimos desconectar MercadoPago. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Desconecta Google Calendar (los turnos dejan de inyectarse en GCal). */
export async function desconectarGoogleCalendar(): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para desconectar Google.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new Error("No encontramos tu negocio.");
  }

  const { error } = await admin.from("negocio_secretos")
    .update({ google_refresh_token: null, google_email: null, google_conectado_at: null })
    .eq("negocio_id", negocio.id as string);

  if (error !== null)
  {
    throw new Error("No pudimos desconectar Google. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza el nombre del negocio del dueño (el link público no cambia). */
export async function actualizarNombreNegocio(nombre: string): Promise<void>
{
  const value = validarNombreNegocio(nombre);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para cambiar el nombre.");
  }

  // Permitir que la demo renombre su negocio.


  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios").update({ nombre: value }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new Error("No pudimos guardar el nombre. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
  revalidatePath("/dashboard");
}
