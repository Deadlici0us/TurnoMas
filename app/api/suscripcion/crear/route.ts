/**
 * Crea la suscripción SaaS (sin plan, `pending`) para el negocio del dueño.
 *
 * Recibe el email de la cuenta de MercadoPago del pagador y devuelve el
 * `init_point` para que complete el checkout (saldo en cuenta o tarjeta).
 * La activación ocurre cuando MP confirma la autorización (webhook).
 */

import { NextResponse } from "next/server";

import { assertDuenoEditable, assertModoEditable } from "@/lib/auth/demo-guard";
import { subscriptionService } from "@/lib/services/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

interface CrearBody
{
  readonly payerEmail?: unknown;
}

/** Indica si corre en el despliegue de producción real. */
function esProduccion(): boolean
{
  return process.env.VERCEL_ENV === "production";
}

/** Traduce los rechazos frecuentes de MercadoPago a un mensaje accionable. */
function mensajeDeError(detalle: string): string
{
  const texto = detalle.toLowerCase();

  if (texto.includes("must be real or test") || texto.includes("real or test users"))
  {
    return "Este entorno de prueba solo acepta pagos con un usuario de test de MercadoPago.";
  }

  if (texto.includes("guest_site_mismatch") || texto.includes("different site"))
  {
    return "Ese email pertenece a una cuenta de MercadoPago de otro país. Usá una cuenta de Argentina.";
  }

  if (texto.includes("both payer and collector")
    || texto.includes("payer and collector")
    || texto.includes("payer_email"))
  {
    return "Usá el email de la misma cuenta de MercadoPago con la que vas a pagar.";
  }

  return "No pudimos activar el plan. Probá de nuevo.";
}

interface FilaNegocio
{
  readonly id: string;
  readonly pais?: unknown;
}

/**
 * Construye la respuesta 403 de modo demo de solo lectura.
 *
 * @param error Error lanzado por los guardas de modo editable.
 * @return Respuesta HTTP 403 con el mensaje del guarda.
 */
function errorSoloLectura(error: unknown): NextResponse
{
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "La demo es de solo lectura." },
    { status: 403 },
  );
}

/**
 * Resuelve el email del pagador: del cuerpo de la solicitud o de la cuenta.
 *
 * @param request Solicitud entrante con el JSON opcional.
 * @param userEmail Email de la cuenta autenticada.
 * @return Email del pagador recortado, o cadena vacía si no hay ninguno.
 */
async function leerPayerEmail(request: Request, userEmail: string | null | undefined): Promise<string>
{
  let body: CrearBody | null = null;

  try
  {
    body = (await request.json()) as CrearBody;
  }
  catch
  {
    body = null;
  }

  const emailPagador = typeof body?.payerEmail === "string" ? body.payerEmail.trim() : "";

  if (emailPagador.length > 0)
  {
    return emailPagador;
  }

  return typeof userEmail === "string" ? userEmail : "";
}

/**
 * Reutiliza una suscripción vigente o pendiente del negocio, si existe.
 *
 * @param negocioId ID del negocio dueño de la suscripción.
 * @return Respuesta de reuso, o null si hay que crear una nueva.
 */
async function respuestaReusoSuscripcion(negocioId: string): Promise<NextResponse | null>
{
  try
  {
    const reconciliacion = await subscriptionService.reconciliar(negocioId);

    if (reconciliacion.estado === "active")
    {
      return NextResponse.json(
        { success: true, activado: true, estado: "active" },
        { status: 200 },
      );
    }

    if (reconciliacion.estado === "pending" && reconciliacion.initPoint !== null)
    {
      return NextResponse.json(
        {
          success: true,
          preapprovalId: reconciliacion.preapprovalId,
          initPoint: reconciliacion.initPoint,
          status: "pending",
          reusado: true,
        },
        { status: 200 },
      );
    }
  }
  catch (error)
  {
    console.error("[suscripcion/crear] reconciliación", error instanceof Error ? error.message : error);
  }

  return null;
}

/**
 * Construye la respuesta 502 de fallo al crear la suscripción.
 *
 * @param error Error capturado durante la creación.
 * @return Respuesta HTTP 502 con detalle en entornos no productivos.
 */
function respuestaFalloCrear(error: unknown): NextResponse
{
  const detalle = error instanceof Error ? error.message : "";
  console.error("[suscripcion/crear]", detalle);

  if (esProduccion())
  {
    return NextResponse.json(
      { error: "No pudimos activar el plan. Probá de nuevo." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: mensajeDeError(detalle), detalle: detalle.slice(0, 300) },
    { status: 502 },
  );
}

export async function POST(request: Request)
{
  try
  {
    await assertModoEditable();
  }
  catch (error)
  {
    return errorSoloLectura(error);
  }

  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user === null)
    {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión para activar el plan." },
        { status: 401 },
      );
    }

    try
    {
      assertDuenoEditable({ userId: user.id, email: user.email ?? null });
    }
    catch (error)
    {
      return errorSoloLectura(error);
    }

    const payerEmail = await leerPayerEmail(request, user.email);

    if (payerEmail.length === 0)
    {
      return NextResponse.json(
        { error: "Necesitamos el email de tu cuenta de MercadoPago." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: negocio } = await admin.from("negocios").select("id, pais")
      .eq("duenio_id", user.id).single();

    if (negocio === null)
    {
      return NextResponse.json(
        { error: "Creá tu negocio antes de activar el plan." },
        { status: 400 },
      );
    }

    const fila = negocio as FilaNegocio;
    const reuso = await respuestaReusoSuscripcion(fila.id);

    if (reuso !== null)
    {
      return reuso;
    }

    const preapproval = await subscriptionService.crearParaNegocio(
      fila.id,
      payerEmail,
      typeof fila.pais === "string" ? fila.pais : null,
    );

    return NextResponse.json(
      {
        success: true,
        preapprovalId: preapproval.id,
        initPoint: preapproval.initPoint,
        status: preapproval.status,
      },
      { status: 200 },
    );
  }
  catch (error)
  {
    return respuestaFalloCrear(error);
  }
}
