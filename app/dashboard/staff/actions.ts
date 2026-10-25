"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/action-result";
import { runAction } from "@/lib/actions/run-action";
import { getNegocioIdDelDueno } from "@/lib/dashboard/negocio";
import { AuthError } from "@/lib/errors/auth-error";
import { ConflictError } from "@/lib/errors/conflict-error";
import { NotFoundError } from "@/lib/errors/not-found-error";
import { UnavailableError } from "@/lib/errors/unavailable-error";
import { esJpeg, normalizarImagenCuadrada, rutaDelBucketLogos } from "@/lib/imagenes/imagen-servidor";
import { IMAGEN_PESO_MAXIMO_SALIDA_BYTES, MENSAJES_IMAGEN } from "@/lib/imagenes/imagen-limites";
import { validarServiciosStaff } from "@/lib/staff/servicios";
import {
  HORARIOS_POR_DEFECTO,
  validarDescripcionStaff,
  validarFotoUrl,
  validarHorariosStaff,
  validarNombreStaff,
} from "@/lib/staff/validation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Estados que cuentan como un turno todavía por atender. */
const ESTADOS_PROXIMOS = ["pendiente", "confirmado", "pagado"] as const;

/** Resuelve el negocio del dueño autenticado o falla con un error de negocio. */
async function contextoDelDueno(mensajeSesion: string)
{

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null)
  {
    throw new AuthError(mensajeSesion);
  }

  const admin = getSupabaseAdmin();
  const negocioId = await getNegocioIdDelDueno(admin, user.id);

  return { admin, negocioId };
}

/** Cuenta turnos totales y próximos de un profesional. */
async function contarTurnos(
  admin: ReturnType<typeof getSupabaseAdmin>,
  negocioId: string,
  staffId: string,
)
{
  const [total, proximos] = await Promise.all([
    admin.from("turnos").select("id", { count: "exact", head: true })
      .eq("staff_id", staffId).eq("negocio_id", negocioId),
    admin.from("turnos").select("id", { count: "exact", head: true })
      .eq("staff_id", staffId).eq("negocio_id", negocioId)
      .gt("fin", new Date().toISOString()).in("estado", ESTADOS_PROXIMOS),
  ]);

  return { total: total.count ?? 0, proximos: proximos.count ?? 0 };
}

/** Agrega un profesional al equipo del negocio del dueño autenticado. */
export async function agregarStaff(nombre: string): Promise<ActionResult<void>>
{
  return runAction("agregarStaff", async () =>
  {
    const value = validarNombreStaff(nombre);
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para agregar profesionales.");

    const { error } = await admin.from("staff")
      .insert({ negocio_id: negocioId, nombre: value, horarios: HORARIOS_POR_DEFECTO });

    if (error !== null)
    {
      throw new UnavailableError("No pudimos agregar al profesional. Probá de nuevo.");
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}

/** Actualiza las franjas horarias semanales de un profesional. */
export async function actualizarHorariosStaff(staffId: string, horarios: unknown): Promise<ActionResult<void>>
{
  return runAction("actualizarHorariosStaff", async () =>
  {
    const value = validarHorariosStaff(horarios);
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para modificar los horarios.");

    const { error } = await admin.from("staff").update({ horarios: value })
      .eq("id", staffId).eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No pudimos guardar los horarios. Probá de nuevo.");
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}

/** Activa o desactiva un profesional del negocio del dueño autenticado. */
export async function cambiarEstadoStaff(staffId: string, activo: boolean): Promise<ActionResult<void>>
{
  return runAction("cambiarEstadoStaff", async () =>
  {
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para modificar el equipo.");

    const { error } = await admin.from("staff").update({ activo })
      .eq("id", staffId).eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No pudimos actualizar al profesional. Probá de nuevo.");
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}

/** Elimina un profesional solo si nunca tuvo turnos (el historial se preserva). */
export async function eliminarStaff(staffId: string): Promise<ActionResult<void>>
{
  return runAction("eliminarStaff", async () =>
  {
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para modificar el equipo.");
    const { total, proximos } = await contarTurnos(admin, negocioId, staffId);

    if (total > 0)
    {
      const detalle = proximos > 0
        ? `Tiene ${proximos} turno${proximos === 1 ? "" : "s"} próximo${proximos === 1 ? "" : "s"} y ${total} en el historial.`
        : `Tiene ${total} turno${total === 1 ? "" : "s"} en el historial.`;

      throw new ConflictError(
        `${detalle} No se puede eliminar; desactivalo para conservar el historial.`,
        proximos > 0 ? "staff_con_turnos_proximos" : "staff_con_historial",
        { total, proximos },
      );
    }

    const { error } = await admin.from("staff").delete()
      .eq("id", staffId).eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new ConflictError(
        "No se puede eliminar: el profesional ya tiene registros asociados. Desactivalo para conservar el historial.",
        "staff_con_historial",
      );
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}

/**
 * Actualiza la descripción y los servicios que brinda un profesional.
 *
 * La descripción es opcional (null si viene vacía). Los servicios se reemplazan
 * por completo; se descartan IDs que no pertenezcan al negocio del dueño.
 */
export async function actualizarPerfilStaff(
  staffId: string,
  descripcion: unknown,
  serviciosIds: unknown,
): Promise<ActionResult<void>>
{
  return runAction("actualizarPerfilStaff", async () =>
  {
    const descripcionValida = validarDescripcionStaff(descripcion);
    const ids = validarServiciosStaff(serviciosIds);
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para modificar el equipo.");

    const { data: servicios } = await admin.from("servicios").select("id").eq("negocio_id", negocioId);
    const permitidos = new Set(((servicios ?? []) as Array<{ id: string }>).map((s) => s.id));
    const serviciosValidos = ids.filter((id) => permitidos.has(id));

    const { error: perfilError } = await admin.from("staff")
      .update({ descripcion: descripcionValida }).eq("id", staffId).eq("negocio_id", negocioId);

    if (perfilError !== null)
    {
      throw new UnavailableError("No pudimos guardar el perfil. Probá de nuevo.");
    }

    const { error: borradoError } = await admin.from("staff_servicios").delete()
      .eq("staff_id", staffId).eq("negocio_id", negocioId);

    if (borradoError !== null)
    {
      throw new UnavailableError("No pudimos guardar los servicios. Probá de nuevo.");
    }

    if (serviciosValidos.length > 0)
    {
      const filas = serviciosValidos.map((servicioId) => ({
        staff_id: staffId,
        servicio_id: servicioId,
        negocio_id: negocioId,
      }));

      const { error: insercionError } = await admin.from("staff_servicios").insert(filas);

      if (insercionError !== null)
      {
        throw new UnavailableError("No pudimos guardar los servicios. Probá de nuevo.");
      }
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}

/**
 * Recibe el JPEG convertido por el navegador, lo normaliza y lo guarda.
 *
 * El cliente ya recorta a 512×512, pero el servidor vuelve a validar los
 * magic bytes, el peso y las dimensiones antes de reencodear y subir.
 */
export async function subirFotoStaff(
  staffId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>>
{
  return runAction("subirFotoStaff", async () =>
  {
    const archivo = formData.get("archivo");

    if (typeof archivo === "string" || archivo === null)
    {
      throw new RangeError(MENSAJES_IMAGEN.falta);
    }

    if (archivo.type !== "image/jpeg")
    {
      throw new RangeError(MENSAJES_IMAGEN.servidor);
    }

    if (archivo.size > IMAGEN_PESO_MAXIMO_SALIDA_BYTES)
    {
      throw new RangeError(MENSAJES_IMAGEN.salida);
    }

    const { admin, negocioId } = await contextoDelDueno(
      "Tenés que iniciar sesión para modificar el equipo.");

    const { data: staff, error: staffError } = await admin.from("staff")
      .select("id, foto_url")
      .eq("id", staffId).eq("negocio_id", negocioId)
      .maybeSingle();

    if (staffError !== null)
    {
      throw new UnavailableError("No pudimos verificar al profesional. Probá de nuevo.");
    }

    if (staff === null)
    {
      throw new NotFoundError("No encontramos ese profesional.");
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());

    if (!esJpeg(buffer))
    {
      throw new RangeError(MENSAJES_IMAGEN.servidor);
    }

    const normalizada = await normalizarImagenCuadrada(buffer);
    const path = `staff/${staffId}/${Date.now()}.jpg`;
    const { error: subidaError } = await admin.storage.from("logos")
      .upload(path, normalizada, { contentType: "image/jpeg", upsert: false });

    if (subidaError !== null)
    {
      throw new UnavailableError("No pudimos subir la foto. Probá de nuevo.");
    }

    const { data } = admin.storage.from("logos").getPublicUrl(path);
    const { error: guardadoError } = await admin.from("staff")
      .update({ foto_url: data.publicUrl })
      .eq("id", staffId).eq("negocio_id", negocioId);

    if (guardadoError !== null)
    {
      await admin.storage.from("logos").remove([path]);

      throw new UnavailableError("No pudimos guardar la foto. Probá de nuevo.");
    }

    const anterior = rutaDelBucketLogos((staff as unknown as { foto_url: string | null }).foto_url);

    if (anterior !== null && anterior.startsWith(`staff/${staffId}/`))
    {
      await admin.storage.from("logos").remove([anterior]);
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");

    return { url: data.publicUrl };
  });
}

/** Guarda la URL pública de la foto del profesional (o la limpia). */
export async function actualizarFotoStaff(staffId: string, fotoUrl: unknown): Promise<ActionResult<void>>
{
  return runAction("actualizarFotoStaff", async () =>
  {
    const url = validarFotoUrl(fotoUrl);
    const { admin, negocioId } = await contextoDelDueno("Tenés que iniciar sesión para modificar el equipo.");
    let anterior: string | null = null;

    if (url === null)
    {
      const { data: staff } = await admin.from("staff")
        .select("foto_url")
        .eq("id", staffId).eq("negocio_id", negocioId)
        .maybeSingle();

      anterior = rutaDelBucketLogos((staff as unknown as { foto_url?: string | null } | null)?.foto_url ?? null);
    }

    const { error } = await admin.from("staff").update({ foto_url: url })
      .eq("id", staffId).eq("negocio_id", negocioId);

    if (error !== null)
    {
      throw new UnavailableError("No pudimos guardar la foto. Probá de nuevo.");
    }

    if (anterior !== null && anterior.startsWith(`staff/${staffId}/`))
    {
      await admin.storage.from("logos").remove([anterior]);
    }

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard");
  });
}
