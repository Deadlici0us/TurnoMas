"use server";

import { revalidatePath } from "next/cache";

import { assertModoEditable } from "@/lib/auth/demo-guard";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

async function exigirDueno(): Promise<{ admin: ReturnType<typeof getSupabaseAdmin>; negocioId: string }>
{
  await assertModoEditable();

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new Error("Tenés que iniciar sesión para modificar clientes.");
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

function exigirWhatsapp(valor: FormDataEntryValue | null): string
{
  const whatsapp = typeof valor === "string" ? valor.trim().replace(/[\s-]/g, "") : "";

  if (!/^\+?\d{6,20}$/.test(whatsapp))
  {
    throw new RangeError("Ese WhatsApp no parece válido.");
  }

  return whatsapp;
}

/** Crea un cliente del negocio del dueño autenticado (demo incluida). */
export async function crearCliente(formData: FormData): Promise<void>
{
  const nombre = exigirNombre(formData.get("nombre"));
  const whatsapp = exigirWhatsapp(formData.get("whatsapp"));
  const { admin, negocioId } = await exigirDueno();

  const { error } = await admin.from("clientes").insert({ negocio_id: negocioId, nombre, whatsapp });

  if (error !== null)
  {
    if (error.code === "23505")
    {
      throw new Error("Ya existe un cliente con ese WhatsApp.");
    }

    throw new Error("No pudimos crear el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}

/** Suma o resta una ausencia al cliente. */
export async function ajustarAusencia(clienteId: string, delta: 1 | -1): Promise<void>
{
  const { admin, negocioId } = await exigirDueno();
  const { data: cliente } = await admin.from("clientes").select("ausencias")
    .eq("id", clienteId).eq("negocio_id", negocioId).single();

  if (cliente === null)
  {
    throw new Error("No encontramos ese cliente.");
  }

  const ausencias = Math.max(0, (cliente as { ausencias: number }).ausencias + delta);
  const { error } = await admin.from("clientes").update({ ausencias })
    .eq("id", clienteId).eq("negocio_id", negocioId);

  if (error !== null)
  {
    throw new Error("No pudimos actualizar las ausencias. Probá de nuevo.");
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
    throw new Error("No pudimos actualizar el cliente. Probá de nuevo.");
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
      throw new Error("No se puede eliminar porque tiene turnos. Bloquealo en su lugar.");
    }

    throw new Error("No pudimos eliminar el cliente. Probá de nuevo.");
  }

  revalidatePath("/dashboard/clientes");
}
