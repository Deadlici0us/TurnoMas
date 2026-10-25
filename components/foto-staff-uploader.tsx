"use client";

import { useRef, useState } from "react";

import type { ActionResult } from "@/lib/actions/action-result";
import { inicialesDe } from "@/components/ui/avatar";
import { convertirImagenCuadrada, validarArchivoImagen } from "@/lib/imagenes/imagen-cliente";
import {
  IMAGEN_ACCEPT,
  IMAGEN_LADO_MAXIMO,
  IMAGEN_LADO_MINIMO,
  IMAGEN_LADO_SALIDA,
  IMAGEN_PESO_MAXIMO_BYTES,
  MENSAJES_IMAGEN,
} from "@/lib/imagenes/imagen-limites";

interface FotoStaffUploaderProps
{
  readonly staffId: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  /** Server Action que recibe el JPEG convertido y devuelve la URL pública. */
  readonly subir: (formData: FormData) => Promise<ActionResult<{ url: string }>>;
  /** Server Action que quita la foto actual. */
  readonly quitar: () => Promise<ActionResult<void>>;
}

/**
 * Carga la foto del profesional al bucket público `logos`.
 *
 * El navegador recorta y comprime la imagen a un JPEG 512×512 antes de
 * enviarla. El servidor vuelve a validar y normalizar antes de guardarla.
 * Sin imagen se muestran las iniciales.
 */
export default function FotoStaffUploader(
  { staffId, nombre, fotoUrl, subir, quitar }: FotoStaffUploaderProps,
)
{
  const [preview, setPreview] = useState<string | null>(fotoUrl);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** Valida, convierte y sube la imagen, y persiste la URL pública. */
  async function cargar(event: React.ChangeEvent<HTMLInputElement>): Promise<void>
  {
    const file = event.target.files?.[0];

    if (file === undefined)
    {
      return;
    }

    setNombreArchivo(file.name);
    setError(null);

    try
    {
      validarArchivoImagen(file);
      setSubiendo(true);

      const jpeg = await convertirImagenCuadrada(file);
      const formData = new FormData();

      formData.set("archivo", jpeg, `foto-${staffId}.jpg`);

      const result = await subir(formData);

      if (!result.ok)
      {
        setError(result.error);

        return;
      }

      setPreview(result.data.url);
    }
    catch (errorCapturado)
    {
      setError(
        errorCapturado instanceof Error && errorCapturado.message.length > 0
          ? errorCapturado.message
          : MENSAJES_IMAGEN.invalida,
      );
    }
    finally
    {
      setSubiendo(false);

      if (inputRef.current !== null)
      {
        inputRef.current.value = "";
      }
    }
  }

  /** Quita la foto del profesional. */
  async function quitarFoto(): Promise<void>
  {
    setSubiendo(true);
    setError(null);

    try
    {
      const result = await quitar();

      if (!result.ok)
      {
        setError(result.error);

        return;
      }

      setPreview(null);
      setNombreArchivo(null);
    }
    catch
    {
      setError("No pudimos quitar la foto. Probá de nuevo.");
    }
    finally
    {
      setSubiendo(false);
    }
  }

  const textoArchivo = nombreArchivo ?? "Sin archivo seleccionado";
  const ayudaId = `foto-ayuda-${staffId}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {preview !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={nombre} className="size-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-warning-soft
            font-heading font-bold text-[#7a5200]">{inicialesDe(nombre)}</span>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={IMAGEN_ACCEPT}
              aria-label={`Foto de ${nombre}`}
              disabled={subiendo}
              onChange={(event) => { void cargar(event); }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              aria-describedby={ayudaId}
              className="ui-btn ui-btn-outline ui-btn-sm"
            >
              {subiendo ? (
                <>
                  <span className="ui-spinner" aria-hidden="true" />
                  Subiendo...
                </>
              ) : "Elegir imagen"}
            </button>
            <span
              className="block max-w-48 truncate text-xs text-muted-foreground"
              title={textoArchivo}
            >
              {textoArchivo}
            </span>
          </div>
          <p id={ayudaId} className="text-xs text-muted-foreground">
            JPG, PNG o WebP. Mínimo {IMAGEN_LADO_MINIMO}×{IMAGEN_LADO_MINIMO} px, máximo{" "}
            {IMAGEN_LADO_MAXIMO}×{IMAGEN_LADO_MAXIMO} px y {IMAGEN_PESO_MAXIMO_BYTES / (1024 * 1024)} MB.
            Se guarda como JPEG {IMAGEN_LADO_SALIDA}×{IMAGEN_LADO_SALIDA}.
          </p>
          {preview !== null ? (
            <button
              type="button"
              onClick={() => { void quitarFoto(); }}
              disabled={subiendo}
              className="text-xs font-semibold text-danger hover:text-danger disabled:opacity-60"
            >
              Quitar foto
            </button>
          ) : null}
        </div>
      </div>
      {error !== null ? <p role="alert" className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
