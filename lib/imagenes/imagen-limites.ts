/**
 * Límites y mensajes compartidos para las imágenes de perfil y logos.
 *
 * El cliente valida el archivo original antes de convertir; el servidor
 * vuelve a validar el JPEG final antes de guardarlo.
 */

/** Lado mínimo aceptado en la imagen original (px). */
export const IMAGEN_LADO_MINIMO = 200;

/** Lado máximo aceptado en la imagen original (px). */
export const IMAGEN_LADO_MAXIMO = 8000;

/** Peso máximo del archivo original que elige el usuario. */
export const IMAGEN_PESO_MAXIMO_BYTES = 8 * 1024 * 1024;

/** Lado del JPEG estandarizado que se guarda en Storage. */
export const IMAGEN_LADO_SALIDA = 512;

/** Calidad del JPEG estandarizado. */
export const IMAGEN_CALIDAD_JPEG = 0.82;

/**
 * Peso máximo del JPEG ya procesado que se sube al servidor.
 *
 * Deja margen para el overhead de `multipart/form-data` dentro del límite
 * por defecto de 1 MB de las Server Actions.
 */
export const IMAGEN_PESO_MAXIMO_SALIDA_BYTES = 512 * 1024;

/** Tipos de imagen que el navegador puede convertir. */
export const IMAGEN_TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"] as const;

/** Valor para el atributo `accept` del input de archivos. */
export const IMAGEN_ACCEPT = IMAGEN_TIPOS_ACEPTADOS.join(",");

/** Mensajes en es-AR para validaciones del cliente y del servidor. */
export const MENSAJES_IMAGEN =
{
  falta: "Elegí una imagen para subir.",
  tipo: "Elegí una imagen JPG, PNG o WebP.",
  peso: `La imagen no puede superar los ${IMAGEN_PESO_MAXIMO_BYTES / (1024 * 1024)} MB.`,
  minimo: `La imagen tiene que medir al menos ${IMAGEN_LADO_MINIMO}×${IMAGEN_LADO_MINIMO} px.`,
  maximo: `La imagen no puede medir más de ${IMAGEN_LADO_MAXIMO}×${IMAGEN_LADO_MAXIMO} px.`,
  invalida: "No pudimos procesar la imagen. Probá con otra.",
  salida: "La imagen procesada es demasiado grande. Probá con otra imagen.",
  servidor: "La imagen tiene que ser un JPEG válido.",
} as const;
