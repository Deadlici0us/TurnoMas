"use client";

import { useRef, useState } from "react";

import type { ActionResult } from "@/lib/actions/action-result";
import { inicialesDe } from "@/components/ui/avatar";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const BUCKET = "logos";
const MAX_BYTES = 5 * 1024 * 1024;

interface LogoNegocioUploaderProps
{
  readonly negocioId: string;
  readonly nombre: string;
  readonly logoUrl: string | null;
  /** Server Action que persiste la URL pública (o null al quitar). */
  readonly action: (url: string | null) => Promise<ActionResult<unknown> | void>;
}

/**
 * Carga el logo del negocio al bucket público `logos`.
 *
 * Sube directo desde el navegador (RLS: el dueño autenticado escribe en
 * `logos`) y luego persiste la URL pública con la Server Action. Logo
 * opcional: sin imagen se muestran las iniciales.
 */
export default function LogoNegocioUploader(
  { negocioId, nombre, logoUrl, action }: LogoNegocioUploaderProps,
)
{
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** Valida, sube la imagen y persiste la URL pública. */
  async function subir(event: React.ChangeEvent<HTMLInputElement>): Promise<void>
  {
    const file = event.target.files?.[0];

    if (file === undefined)
    {
      return;
    }

    if (!file.type.startsWith("image/"))
    {
      setError("Elegí una imagen (JPG, PNG o WebP).");
      return;
    }

    if (file.size > MAX_BYTES)
    {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setSubiendo(true);
    setError(null);

    try
    {
      const supabase = getSupabaseBrowser();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `negocio/${negocioId}/${Date.now()}.${extension}`;
      const { error: subidaError } = await supabase.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (subidaError !== null)
      {
        throw new Error(subidaError.message);
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const result = await action(data.publicUrl);

      if (result !== undefined && !result.ok)
      {
        setError(result.error);
        return;
      }

      setPreview(data.publicUrl);
    }
    catch
    {
      setError("No pudimos subir el logo. Probá de nuevo.");
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

  /** Quita el logo del negocio. */
  async function quitar(): Promise<void>
  {
    setSubiendo(true);
    setError(null);

    try
    {
      const result = await action(null);

      if (result !== undefined && !result.ok)
      {
        setError(result.error);
        return;
      }

      setPreview(null);
    }
    catch
    {
      setError("No pudimos quitar el logo. Probá de nuevo.");
    }
    finally
    {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold text-ink">Logo de tu negocio</span>
      <div className="flex items-center gap-3">
        {preview !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={nombre} className="size-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-info-soft
            font-heading font-bold text-[#0b6e93]">{inicialesDe(nombre)}</span>
        )}
        <div className="space-y-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label="Logo del negocio"
            disabled={subiendo}
            onChange={(event) => { void subir(event); }}
            className="block text-xs text-ink file:mr-3 file:rounded-full file:border-0
              file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white
              hover:file:bg-primary-hover disabled:opacity-60"
          />
          {preview !== null ? (
            <button
              type="button"
              onClick={() => { void quitar(); }}
              disabled={subiendo}
              className="text-xs font-semibold text-danger hover:text-danger disabled:opacity-60"
            >
              Quitar logo
            </button>
          ) : null}
        </div>
      </div>
      {error !== null ? <p role="alert" className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
