/**
 * Normalización de la foto de perfil del profesional en el servidor.
 *
 * El cliente ya entrega un JPEG recortado; el servidor vuelve a validar
 * formato y dimensiones y reencodea para descartar metadatos o contenido
 * manipulado antes de guardarlo en Storage.
 */

import sharp from "sharp";

import {
  FOTO_CALIDAD_JPEG,
  FOTO_LADO_MAXIMO,
  FOTO_LADO_MINIMO,
  FOTO_LADO_SALIDA,
  MENSAJES_FOTO,
} from "./foto-limites";

/** Marca de las URLs públicas del bucket `logos`. */
const MARCA_BUCKET_LOGOS = "/storage/v1/object/public/logos/";

/** Indica si el buffer empieza con los magic bytes de un JPEG. */
export function esJpeg(buffer: Buffer): boolean
{
  return buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff;
}

/**
 * Extrae la ruta interna del bucket `logos` desde una URL pública.
 *
 * @param url URL pública guardada en `staff.foto_url`.
 * @return Ruta relativa o null si la URL no pertenece al bucket.
 */
export function rutaFotoDelBucket(url: string | null): string | null
{
  if (url === null)
  {
    return null;
  }

  try
  {
    const parsed = new URL(url);
    const indice = parsed.pathname.indexOf(MARCA_BUCKET_LOGOS);

    if (indice < 0)
    {
      return null;
    }

    const ruta = parsed.pathname.slice(indice + MARCA_BUCKET_LOGOS.length);

    return ruta.length > 0 ? decodeURIComponent(ruta) : null;
  }
  catch
  {
    return null;
  }
}

/** Valida dimensiones reales del JPEG recibido. */
function validarDimensiones(ancho: number, alto: number): void
{
  if (ancho < FOTO_LADO_MINIMO || alto < FOTO_LADO_MINIMO)
  {
    throw new RangeError(MENSAJES_FOTO.minimo);
  }

  if (ancho > FOTO_LADO_MAXIMO || alto > FOTO_LADO_MAXIMO)
  {
    throw new RangeError(MENSAJES_FOTO.maximo);
  }
}

/**
 * Valida y estandariza un JPEG a 512×512, sin metadatos y sobre fondo blanco.
 *
 * @param buffer Contenido binario recibido desde el cliente.
 * @return JPEG normalizado listo para subir a Storage.
 */
export async function normalizarFotoPerfil(buffer: Buffer): Promise<Buffer>
{
  if (!esJpeg(buffer))
  {
    throw new RangeError(MENSAJES_FOTO.servidor);
  }

  try
  {
    const imagen = sharp(buffer, {
      failOn: "error",
      limitInputPixels: FOTO_LADO_MAXIMO * FOTO_LADO_MAXIMO,
    });
    const metadata = await imagen.metadata();

    if (metadata.format !== "jpeg")
    {
      throw new RangeError(MENSAJES_FOTO.servidor);
    }

    validarDimensiones(metadata.width ?? 0, metadata.height ?? 0);

    return await imagen
      .rotate()
      .resize(FOTO_LADO_SALIDA, FOTO_LADO_SALIDA, {
        fit: "cover",
        position: "centre",
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: Math.round(FOTO_CALIDAD_JPEG * 100), mozjpeg: true })
      .toBuffer();
  }
  catch (error)
  {
    if (error instanceof RangeError)
    {
      throw error;
    }

    throw new RangeError(MENSAJES_FOTO.invalida);
  }
}
