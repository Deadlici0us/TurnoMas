"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ADMIN_NO_AUTORIZADO, isAdminEmail } from "@/lib/auth/admin";
import { promocionService } from "@/lib/services/promociones";
import { getSupabaseServer } from "@/lib/supabase/server";

const ADMIN_PROMOCIONES_ROUTE = "/admin/promociones";
const MOTIVO_MAXIMO = 200;

/**
 * Exige una sesión cuyo email coincida con ADMIN_EMAIL.
 *
 * @return Email del administrador.
 * @throws Error cuando no hay sesión o el email no está autorizado.
 */
async function exigirAdmin(): Promise<string>
{
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null || !isAdminEmail(user.email))
  {
    throw new Error(ADMIN_NO_AUTORIZADO);
  }

  return user.email ?? "";
}

/**
 * Lee un campo de texto obligatorio del formulario.
 *
 * @param formData Formulario de la acción.
 * @param campo Nombre del campo.
 * @return Valor recortado.
 */
function textoObligatorio(formData: FormData, campo: string): string
{
  const valor = formData.get(campo);

  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    throw new RangeError(`Falta el campo ${campo}.`);
  }

  return valor.trim();
}

/**
 * Lee un entero positivo del formulario.
 *
 * @param formData Formulario de la acción.
 * @param campo Nombre del campo.
 * @return Entero validado.
 */
function enteroObligatorio(formData: FormData, campo: string): number
{
  const valor = Number(textoObligatorio(formData, campo));

  if (!Number.isInteger(valor))
  {
    throw new RangeError(`El campo ${campo} debe ser un entero.`);
  }

  return valor;
}

/**
 * Lee el motivo opcional y lo acota al máximo permitido.
 *
 * @param formData Formulario de la acción.
 * @return Motivo recortado o null.
 */
function motivoOpcional(formData: FormData): string | null
{
  const valor = formData.get("motivo");

  if (typeof valor !== "string" || valor.trim().length === 0)
  {
    return null;
  }

  return valor.trim().slice(0, MOTIVO_MAXIMO);
}

/**
 * Aplica o extiende una promo porcentual a un negocio.
 *
 * @param formData Campos `negocioId`, `porcentaje`, `meses` y `motivo`.
 */
export async function aplicarPromocion(formData: FormData): Promise<void>
{
  const adminEmail = await exigirAdmin();
  const negocioId = textoObligatorio(formData, "negocioId");
  const porcentaje = enteroObligatorio(formData, "porcentaje");
  const meses = enteroObligatorio(formData, "meses");
  const resultado = await promocionService.aplicar({
    negocioId,
    porcentaje,
    meses,
    motivo: motivoOpcional(formData),
    createdBy: adminEmail,
  });

  revalidatePath(ADMIN_PROMOCIONES_ROUTE);
  revalidatePath("/dashboard/suscripcion");

  if (resultado.sincronizacion.error !== null)
  {
    const query = new URLSearchParams({ error: resultado.sincronizacion.error }).toString();
    redirect(`${ADMIN_PROMOCIONES_ROUTE}?${query}`);
  }

  redirect(`${ADMIN_PROMOCIONES_ROUTE}?ok=1`);
}

/**
 * Termina una promo antes de su vencimiento y restaura el precio base.
 *
 * @param formData Campo `negocioId`.
 */
export async function finalizarPromocion(formData: FormData): Promise<void>
{
  await exigirAdmin();
  const negocioId = textoObligatorio(formData, "negocioId");
  const resultado = await promocionService.finalizar(negocioId);

  revalidatePath(ADMIN_PROMOCIONES_ROUTE);
  revalidatePath("/dashboard/suscripcion");

  if (resultado.error !== null)
  {
    const query = new URLSearchParams({ error: resultado.error }).toString();
    redirect(`${ADMIN_PROMOCIONES_ROUTE}?${query}`);
  }

  redirect(`${ADMIN_PROMOCIONES_ROUTE}?ok=1`);
}
