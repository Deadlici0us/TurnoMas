"use client";

import {
  IMAGEN_CALIDAD_JPEG,
  IMAGEN_LADO_MAXIMO,
  IMAGEN_LADO_MINIMO,
  IMAGEN_LADO_SALIDA,
  IMAGEN_PESO_MAXIMO_BYTES,
  IMAGEN_PESO_MAXIMO_SALIDA_BYTES,
  IMAGEN_TIPOS_ACEPTADOS,
  MENSAJES_IMAGEN,
} from "./imagen-limites";

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
export function validarArchivoImagen(file: File): void
{
  if (!IMAGEN_TIPOS_ACEPTADOS.includes(file.type as (typeof IMAGEN_TIPOS_ACEPTADOS)[number]))
  {
    throw new RangeError(MENSAJES_IMAGEN.tipo);
  }

  if (file.size === 0)
  {
    throw new RangeError(MENSAJES_IMAGEN.invalida);
  }

  if (file.size > IMAGEN_PESO_MAXIMO_BYTES)
  {
    throw new RangeError(MENSAJES_IMAGEN.peso);
  }
}

/** Valida las dimensiones reales ya decodificadas. */
function validarDimensiones(ancho: number, alto: number): void
{
  if (ancho < IMAGEN_LADO_MINIMO || alto < IMAGEN_LADO_MINIMO)
  {
    throw new RangeError(MENSAJES_IMAGEN.minimo);
  }

  if (ancho > IMAGEN_LADO_MAXIMO || alto > IMAGEN_LADO_MAXIMO)
  {
    throw new RangeError(MENSAJES_IMAGEN.maximo);
  }
}

/**
 * Decodifica, recorta y convierte la imagen a un JPEG cuadrado de 512×512.
 *
 * La orientación EXIF se respeta con `imageOrientation: "from-image"`.
 * La transparencia se aplana sobre blanco antes de exportar como JPEG.
 */
export async function convertirImagenCuadrada(file: File): Promise<Blob>
{
  validarArchivoImagen(file);

  let bitmap: ImageBitmap;

  try
  {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  }
  catch
  {
    throw new RangeError(MENSAJES_IMAGEN.invalida);
  }

  try
  {
    validarDimensiones(bitmap.width, bitmap.height);

    const recorte = calcularRecorteCuadrado(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");

    canvas.width = IMAGEN_LADO_SALIDA;
    canvas.height = IMAGEN_LADO_SALIDA;

    const contexto = canvas.getContext("2d");

    if (contexto === null)
    {
      throw new RangeError(MENSAJES_IMAGEN.invalida);
    }

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, IMAGEN_LADO_SALIDA, IMAGEN_LADO_SALIDA);
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
      IMAGEN_LADO_SALIDA,
      IMAGEN_LADO_SALIDA,
    );

    const jpeg = await new Promise<Blob>((resolve, reject) =>
    {
      canvas.toBlob(
        (blob) =>
        {
          if (blob === null)
          {
            reject(new RangeError(MENSAJES_IMAGEN.invalida));

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        IMAGEN_CALIDAD_JPEG,
      );
    });

    if (jpeg.size > IMAGEN_PESO_MAXIMO_SALIDA_BYTES)
    {
      throw new RangeError(MENSAJES_IMAGEN.salida);
    }

    return jpeg;
  }
  catch (error)
  {
    if (error instanceof RangeError)
    {
      throw error;
    }

    throw new RangeError(MENSAJES_IMAGEN.invalida);
  }
  finally
  {
    bitmap.close();
  }
}
