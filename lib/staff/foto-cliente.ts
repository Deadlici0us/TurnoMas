"use client";

import {
  FOTO_CALIDAD_JPEG,
  FOTO_LADO_MAXIMO,
  FOTO_LADO_MINIMO,
  FOTO_LADO_SALIDA,
  FOTO_PESO_MAXIMO_BYTES,
  FOTO_PESO_MAXIMO_SALIDA_BYTES,
  FOTO_TIPOS_ACEPTADOS,
  MENSAJES_FOTO,
} from "./foto-limites";

/** Coordenadas del recorte cuadrado centrado de una imagen. */
export interface RecorteCuadrado
{
  readonly sx: number;
  readonly sy: number;
  readonly lado: number;
}

/**
 * Calcula el recorte cuadrado centrado de una imagen.
 *
 * @param ancho Ancho original en px.
 * @param alto Alto original en px.
 * @return Origen y lado del cuadrado a recortar.
 */
export function calcularRecorteCuadrado(ancho: number, alto: number): RecorteCuadrado
{
  const lado = Math.min(ancho, alto);

  return {
    sx: Math.round((ancho - lado) / 2),
    sy: Math.round((alto - lado) / 2),
    lado,
  };
}

/** Valida tipo y peso del archivo elegido por el usuario. */
export function validarArchivoFoto(file: File): void
{
  if (!FOTO_TIPOS_ACEPTADOS.includes(file.type as (typeof FOTO_TIPOS_ACEPTADOS)[number]))
  {
    throw new RangeError(MENSAJES_FOTO.tipo);
  }

  if (file.size === 0)
  {
    throw new RangeError(MENSAJES_FOTO.invalida);
  }

  if (file.size > FOTO_PESO_MAXIMO_BYTES)
  {
    throw new RangeError(MENSAJES_FOTO.peso);
  }
}

/** Valida las dimensiones reales ya decodificadas. */
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
 * Decodifica, recorta y convierte la imagen a un JPEG cuadrado de 512×512.
 *
 * La orientación EXIF se respeta con `imageOrientation: "from-image"`.
 * La transparencia se aplana sobre blanco antes de exportar como JPEG.
 */
export async function convertirFotoPerfil(file: File): Promise<Blob>
{
  validarArchivoFoto(file);

  let bitmap: ImageBitmap;

  try
  {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  }
  catch
  {
    throw new RangeError(MENSAJES_FOTO.invalida);
  }

  try
  {
    validarDimensiones(bitmap.width, bitmap.height);

    const recorte = calcularRecorteCuadrado(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");

    canvas.width = FOTO_LADO_SALIDA;
    canvas.height = FOTO_LADO_SALIDA;

    const contexto = canvas.getContext("2d");

    if (contexto === null)
    {
      throw new RangeError(MENSAJES_FOTO.invalida);
    }

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, FOTO_LADO_SALIDA, FOTO_LADO_SALIDA);
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    contexto.drawImage(
      bitmap,
      recorte.sx,
      recorte.sy,
      recorte.lado,
      recorte.lado,
      0,
      0,
      FOTO_LADO_SALIDA,
      FOTO_LADO_SALIDA,
    );

    const jpeg = await new Promise<Blob>((resolve, reject) =>
    {
      canvas.toBlob(
        (blob) =>
        {
          if (blob === null)
          {
            reject(new RangeError(MENSAJES_FOTO.invalida));

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        FOTO_CALIDAD_JPEG,
      );
    });

    if (jpeg.size > FOTO_PESO_MAXIMO_SALIDA_BYTES)
    {
      throw new RangeError(MENSAJES_FOTO.salida);
    }

    return jpeg;
  }
  catch (error)
  {
    if (error instanceof RangeError)
    {
      throw error;
    }

    throw new RangeError(MENSAJES_FOTO.invalida);
  }
  finally
  {
    bitmap.close();
  }
}
