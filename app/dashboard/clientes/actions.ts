"use server";

import { revalidatePath } from "next/cache";

import { normalizarWhatsappCliente } from "@/lib/clientes/whatsapp";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { normalizarEmailCliente } from "@/lib/validation/email";

async function exigirDueno(): Promise<{ admin: ReturnType<typeof getSupabaseAdmin>; negocioId: string }>
{

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError("Tenés que iniciar sesión para modificar clientes.");
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  return { admin, negocioId };
}

function exigirNombre(valor: FormDataEntryValue | null): string
{
  const nombre = typeof valor === "string" ? valor.trim() : "";

  if (nombre.length < 2 || nombre.length > 80)
  {
    throw new RangeError("El nombre tiene que tener entre 2 y 80 caracteres.");
  }

  return nombre;
}

/** Crea un cliente del negocio del dueño autenticado. */
export async function crearCliente(formData: FormData): Promise<void>
{
  const nombre = exigirNombre(formData.get("nombre"));
  const whatsapp = normalizarWhatsappCliente(formData.get("whatsapp"));
  const email = normalizarEmailCliente(formData.get("email"));
  const { admin, negocioId } = await exigirDueno();

  const { error } = await admin.from("clientes").insert({ negocio_id: negocioId, nombre, whatsapp, email });

  if (error !== null)
  {
    if (error.code === "23505")
    {
      throw new ConflictError("Ya existe un cliente con ese WhatsApp.");
    }

    throw new UnavailableError("No pudimos crear el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}

/** Actualiza nombre, WhatsApp y email de un cliente del negocio. */
export async function actualizarCliente(clienteId: string, formData: FormData): Promise<void>
{
  const nombre = exigirNombre(formData.get("nombre"));
  const whatsapp = normalizarWhatsappCliente(formData.get("whatsapp"));
  const email = normalizarEmailCliente(formData.get("email"));
  const { admin, negocioId } = await exigirDueno();

  const { error } = await admin.from("clientes").update({ nombre, whatsapp, email })
    .eq("id", clienteId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    if (error.code === "23505")
    {
      throw new ConflictError("Ese WhatsApp ya pertenece a otro cliente.");
    }

    throw new UnavailableError("No pudimos actualizar el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
  revalidatePath(`/dashboard/clientes/${clienteId}`);
}

/** Suma o resta una ausencia al cliente. */
export async function ajustarAusencia(clienteId: string, delta: 1 | -1): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();
  const { data: cliente } = await admin.from("clientes").select("ausencias")
    .eq("id", clienteId).eq("negocio_id", negocioId).single();

  if (cliente === null)
  {
    throw new NotFoundError("No encontramos ese cliente.");
  }

  const ausencias = Math.max(0, (cliente as { ausencias: number }).ausencias + delta);
  const { error } = await admin.from("clientes").update({ ausencias })
    .eq("id", clienteId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos actualizar las ausencias. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}

/** Bloquea o desbloquea manualmente a un cliente. */
export async function cambiarBloqueoCliente(clienteId: string, bloqueado: boolean): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();
  const { error } = await admin.from("clientes").update({ bloqueado })
    .eq("id", clienteId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new UnavailableError("No pudimos actualizar el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}

/** Elimina un cliente sin turnos asociados. */
export async function eliminarCliente(clienteId: string): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();
  const { error } = await admin.from("clientes").delete()
    .eq("id", clienteId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    if (error.code === "23503")
    {
      throw new ConflictError("No se puede eliminar porque tiene turnos. Bloquealo en su lugar.");
    }

    throw new UnavailableError("No pudimos eliminar el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}
