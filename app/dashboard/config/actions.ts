"use server";

import { revalidatePath } from "next/cache";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { validarDescripcionNegocio, validarNombreNegocio } from "@/lib/negocios/validation";
import { validarWhatsappNegocio } from "@/lib/negocios/whatsapp";
import { validarTimezone } from "@/lib/timezone/timezone";
import { sanitizeUrlExterna } from "@/lib/validation/url";
import
{
  codigoCoincide,
  enmascararEmail,
  firmarTokenEliminacion,
  generarCodigoEliminacion,
  hashCodigoEliminacion,
  MINUTOS_VIGENCIA_CODIGO,
  validarTextoConfirmacion,
  verificarTokenEliminacion,
} from "@/lib/negocios/eliminacion";
import { ResendAdapter } from "@/lib/ports/email";
import { readEnv } from "@/lib/env/env";
import { validarHorariosStaff } from "@/lib/staff/validation";

import { RETENCION_MAX_HS, RETENCION_MIN_HS } from "@/lib/payments/refund-policy";
import { REMARKETING_MAX_DIAS, REMARKETING_MIN_DIAS } from "@/lib/automations/remarketing";
import { RECORDATORIO_MAX_HS, RECORDATORIO_MIN_HS } from "@/lib/automations/recordatorios";
import { RESENA_MAX_HS, RESENA_MIN_HS } from "@/lib/automations/resenas";
import { normalizarTextoPlantilla, validarGoogleMapsUrl, validarGooglePlaceId } from "@/lib/notifications/custom-templates";
import type { TipoPlantillaConfigurable } from "@/lib/notifications/custom-templates";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { ForbiddenError } from "@/lib/errors/forbidden-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { ValidationError } from "@/lib/errors/validation-error";

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
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ blacklist_umbral: umbral, blacklist_penalidad: penalidad }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza la ventana de retención de seña del negocio (default 72hs). */
export async function actualizarPoliticaSena(retencionHs: number): Promise<void>
{
  if (!Number.isInteger(retencionHs) || retencionHs < RETENCION_MIN_HS || retencionHs > RETENCION_MAX_HS)
  {
    throw new RangeError(`La retención debe ser un entero entre ${RETENCION_MIN_HS} y ${RETENCION_MAX_HS} horas.`);
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ sena_retencion_hs: retencionHs }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Lee el negocio del dueño o lanza si no existe. */
async function exigirNegocioDelDueno(admin: ReturnType<typeof getSupabaseAdmin>, userId: string)
{
  const { data: negocio } = await admin.from("negocios").select("id, resena_activa")
    .eq("duenio_id", userId).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  return negocio as { id: string; resena_activa?: unknown };
}

/** Actualiza recordatorios automáticos del negocio (toggle + ventana). */
export async function actualizarPoliticaRecordatorios(activo: boolean, hs: number): Promise<void>
{
  if (!Number.isInteger(hs) || hs < RECORDATORIO_MIN_HS || hs > RECORDATORIO_MAX_HS)
  {
    throw new RangeError(
      `El recordatorio debe ser un entero entre ${RECORDATORIO_MIN_HS} y ${RECORDATORIO_MAX_HS} horas.`);
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ recordatorio_activo: activo, recordatorio_hs: hs }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza el pedido de reseñas del negocio (toggle + demora). */
export async function actualizarPoliticaResenas(activa: boolean, hs: number): Promise<void>
{
  if (!Number.isInteger(hs) || hs < RESENA_MIN_HS || hs > RESENA_MAX_HS)
  {
    throw new RangeError(`La reseña debe ser un entero entre ${RESENA_MIN_HS} y ${RESENA_MAX_HS} horas.`);
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ resena_activa: activa, resena_hs: hs }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza el remarketing del negocio (toggle + default de días). */
export async function actualizarPoliticaRemarketing(activo: boolean, dias: number): Promise<void>
{
  if (!Number.isInteger(dias) || dias < REMARKETING_MIN_DIAS || dias > REMARKETING_MAX_DIAS)
  {
    throw new RangeError(
      `El remarketing debe ser un entero entre ${REMARKETING_MIN_DIAS} y ${REMARKETING_MAX_DIAS} días.`);
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ remarketing_activo: activo, remarketing_dias: dias }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

const TIPOS_PLANTILLA: Record<TipoPlantillaConfigurable, { subject: string; cuerpo: string }> = {
  confirmacion: { subject: "msg_confirmacion_subject", cuerpo: "msg_confirmacion_cuerpo" },
  recordatorio: { subject: "msg_recordatorio_subject", cuerpo: "msg_recordatorio_cuerpo" },
  resena: { subject: "msg_resena_subject", cuerpo: "msg_resena_cuerpo" },
  remarketing: { subject: "msg_remarketing_subject", cuerpo: "msg_remarketing_cuerpo" },
};

/** Guarda la plantilla personalizada de un tipo de mensaje (null = default). */
export async function actualizarPlantillaMensaje(
  tipo: TipoPlantillaConfigurable,
  subject: string | null,
  cuerpo: string | null,
): Promise<void>
{
  const columnas = TIPOS_PLANTILLA[tipo];

  if (columnas === undefined)
  {
    throw new RangeError("Ese tipo de mensaje no existe.");
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios").update({
    [columnas.subject]: normalizarTextoPlantilla(subject, 120),
    [columnas.cuerpo]: normalizarTextoPlantilla(cuerpo, 2000),
  }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Guarda el link de Google Maps del negocio (dato de ubicación del local). */
export async function actualizarGoogleMapsUrl(url: string | null): Promise<void>
{
  const valor = validarGoogleMapsUrl(url);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ google_maps_url: valor }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/**
 * Guarda la descripción breve del negocio (se muestra en el portal público).
 */
export async function actualizarDescripcionNegocio(descripcion: string | null): Promise<void>
{
  const valor = validarDescripcionNegocio(descripcion);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la descripción.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ descripcion: valor }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la descripción. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/**
 * Guarda (o quita) el logo del negocio.
 *
 * El archivo se sube desde el navegador al bucket público `logos`; acá solo
 * se persiste la URL pública saneada.
 */
export async function actualizarLogoNegocio(url: string | null): Promise<void>
{
  const valor = url === null || url === undefined ? null : sanitizeUrlExterna(url);

  if (url !== null && url !== undefined && valor === null)
  {
    throw new RangeError("La imagen del logo no es válida.");
  }

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar el logo.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ logo_url: valor }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar el logo. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/**
 * Guarda el place ID de Google del negocio (para el link directo de reseña).
 */
export async function actualizarGooglePlaceId(valor: string | null): Promise<void>
{
  const placeId = validarGooglePlaceId(valor);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la configuración.");
  }

  const admin = getSupabaseAdmin();
  const negocio = await exigirNegocioDelDueno(admin, user.id);

  if (negocio.resena_activa === false && placeId !== null)
  {
    throw new RangeError("Activá las reseñas para guardar el place ID de Google.");
  }

  const { error } = await admin.from("negocios")
    .update({ google_place_id: placeId }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la configuración. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/**
 * Guarda el WhatsApp propio del negocio (la línea que ve el cliente).
 *
 * Plan app-only: es solo un dato de contacto, no conecta Meta API.
 */
export async function actualizarWhatsappNegocio(valor: string | null): Promise<void>
{
  const whatsapp = validarWhatsappNegocio(valor);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar el WhatsApp.");
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios")
    .update({ whatsapp }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar el WhatsApp. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/**
 * Desconecta MercadoPago (OAuth).
 *
 * Bloqueado si hay servicios con seña activa: primero se desactivan en
 * Servicios. La demo nunca toca secretos.
 */
export async function desconectarMercadoPago(): Promise<void>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para desconectar MercadoPago.");
  }

  assertDuenoEditable({ userId: user.id, email: user.email ?? null });

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  const negocioId = negocio.id as string;
  const { data: conSena } = await admin.from("servicios")
    .select("id").eq("negocio_id", negocioId).eq("sena_requerida", true).limit(1);

  if (Array.isArray(conSena) && conSena.length > 0)
  {
    throw new ConflictError("Tenés servicios con seña activa. Desactivalas primero en Servicios.");
  }

  const { error } = await admin.from("negocio_secretos")
    .update({ mercadopago_access_token: null, mercadopago_refresh_token: null })
    .eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos desconectar MercadoPago. Probá de nuevo.");
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
    throw new AuthError("Tenés que iniciar sesión para desconectar Google.");
  }

  const admin = getSupabaseAdmin();
  const { data: negocio } = await admin.from("negocios").select("id")
    .eq("duenio_id", user.id).single();

  if (negocio === null)
  {
    throw new NotFoundError("No encontramos tu negocio.");
  }

  const { error } = await admin.from("negocio_secretos")
    .update({ google_refresh_token: null, google_email: null, google_conectado_at: null })
    .eq("negocio_id", negocio.id as string);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos desconectar Google. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza los horarios del negocio (techo amplio: cada profesional recorta el suyo). */
export async function actualizarHorariosNegocio(horarios: unknown): Promise<void>
{
  const value = validarHorariosStaff(horarios);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar los horarios.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("negocios").update({ horarios: value }).eq("id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar los horarios. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
}

/** Actualiza la zona horaria IANA del negocio (ej. America/Mexico_City). */
export async function actualizarTimezoneNegocio(timezone: string): Promise<void>
{
  const value = validarTimezone(timezone);

  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para cambiar la zona horaria.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  const { error } = await admin.from("negocios").update({ timezone: value }).eq("id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar la zona horaria. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
  revalidatePath("/dashboard/agenda");
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
    throw new AuthError("Tenés que iniciar sesión para cambiar el nombre.");
  }

  // Permitir que la demo renombre su negocio.


  const admin = getSupabaseAdmin();
  const { error } = await admin.from("negocios").update({ nombre: value }).eq("duenio_id", user.id);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos guardar el nombre. Probá de nuevo.");
  }

  revalidatePath("/dashboard/config");
  revalidatePath("/dashboard");
}

export interface SolicitudEliminacion
{
  readonly token: string;
  readonly emailEnmascarado: string;
}

function secretoEliminacion(): string
{
  const secreto = readEnv("ELIMINACION_SECRET") ?? readEnv("SUPABASE_SECRET_KEY");

  if (secreto === null || secreto.trim().length === 0)
  {
    throw new UnavailableError("Falta configurar el secreto de eliminación en el entorno.");
  }

  return secreto;
}

function escapeHtmlEliminacion(valor: string): string
{
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Envía el código de 6 dígitos al email del dueño para borrar el negocio.
 *
 * @return Token firmado (campo oculto) + email enmascarado para la UI.
 */
export async function solicitarEliminacionNegocio(): Promise<SolicitudEliminacion>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  if (user === null || email.length === 0)
  {
    throw new AuthError("Tenés que iniciar sesión para eliminar tu negocio.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);
  const { data: negocio } = await admin.from("negocios").select("nombre").eq("id", negocioId).single();
  const nombre = typeof (negocio as { nombre?: unknown } | null)?.nombre === "string"
    ? (negocio as { nombre: string }).nombre
    : "tu negocio";

  const codigo = generarCodigoEliminacion();
  const token = firmarTokenEliminacion({
    negocioId,
    email,
    codigoHash: hashCodigoEliminacion(codigo),
    exp: Date.now() + MINUTOS_VIGENCIA_CODIGO * 60_000,
  }, secretoEliminacion());

  await new ResendAdapter().send({
    to: email,
    subject: `Confirmá la eliminación de ${nombre} (${codigo})`,
    fromName: "TurnoMas",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">` +
      `<h2>Confirmá la eliminación de ${escapeHtmlEliminacion(nombre)}</h2>` +
      `<p>Tu código es <strong style="font-size:24px;letter-spacing:4px">${codigo}</strong> ` +
      `y vence en ${MINUTOS_VIGENCIA_CODIGO} minutos.</p>` +
      `<p>Ingresalo en el panel junto con la palabra ELIMINAR. ` +
      `Esto borra turnos, clientes, servicios, staff e integraciones. No se puede deshacer.</p>` +
      `<p style="color:#64748b;font-size:12px">Si no pediste esto, ignorá este email.</p></div>`,
  });

  return { token, emailEnmascarado: enmascararEmail(email) };
}

/** Borra el negocio y la cuenta tras validar token + código del email + texto. */
export async function confirmarEliminacionNegocio(token: string, codigo: string, texto: string): Promise<void>
{
  await assertModoEditable();
  validarTextoConfirmacion(texto);

  const payload = verificarTokenEliminacion(token, secretoEliminacion());

  if (!codigoCoincide(codigo.trim(), payload.codigoHash))
  {
    throw new ValidationError("El código no coincide. Revisá tu email e intentá de nuevo.");
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para eliminar tu negocio.");
  }

  if (user.email !== payload.email)
  {
    throw new ForbiddenError("Ese código se envió a otro email. Pedí uno nuevo.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  if (negocioId !== payload.negocioId)
  {
    throw new ForbiddenError("Ese código no corresponde a tu negocio. Pedí uno nuevo.");
  }

  // Turnos referencia staff/servicios/clientes con restrict: van primero.
  const { error: errorTurnos } = await admin.from("turnos").delete().eq("negocio_id", negocioId);

  if (errorTurnos !== null)
  {
    throw new UnavailableError("No pudimos eliminar tu negocio. Probá de nuevo.");
  }

  const borrados = await Promise.all([
    admin.from("clientes").delete().eq("negocio_id", negocioId),
    admin.from("servicios").delete().eq("negocio_id", negocioId),
    admin.from("staff").delete().eq("negocio_id", negocioId),
  ]);

  for (const r of borrados)
  {
    if (r.error !== null)
    {
      throw new UnavailableError("No pudimos eliminar tu negocio. Probá de nuevo.");
    }
  }

  // Turnos usa restrict hacia staff/servicios/clientes: ya se borraron arriba.
  const resto = await Promise.all([
    admin.from("negocio_secretos").delete().eq("negocio_id", negocioId),
    admin.from("negocios").delete().eq("id", negocioId),
  ]);

  for (const r of resto)
  {
    if (r.error !== null)
    {
      throw new UnavailableError("No pudimos eliminar tu negocio. Probá de nuevo.");
    }
  }

  try
  {
    await admin.auth.admin.deleteUser(user.id);
  }
  catch
  {
    // El negocio ya se borró; si el usuario auth persiste, el signOut lo desloguea igual.
  }

  await supabase.auth.signOut();
}
