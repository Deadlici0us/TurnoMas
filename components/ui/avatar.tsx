import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "cn";

export interface AvatarProps
{
  /** Nombre para iniciales y texto alternativo de la imagen. */
  readonly name: string;
  /** URL del logo; null o vacío cae a iniciales. */
  readonly src?: string | null;
  readonly className?: string;
}

/** Iniciales de hasta dos palabras del nombre. */
export function inicialesDe(nombre: string): string
{
  const partes = nombre.trim().split(/\s+/).filter((parte) => parte.length > 0);

  if (partes.length === 0)
  {
    return "?";
  }

  const iniciales = partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? "").join("");

  return iniciales.length > 0 ? iniciales : "?";
}

/**
 * Avatar redondo con logo del negocio y fallback a iniciales.
 *
 * @param props nombre, URL opcional del logo y clases extra.
 * @return Avatar accesible y reutilizable.
 */
export default function Avatar({ name, src, className }: AvatarProps)
{
  const conImagen = typeof src === "string" && src.trim().length > 0;

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden",
        "rounded-full border border-line bg-soft",
        className,
      )}
    >
      {conImagen ? (
        <AvatarPrimitive.Image
          keepMounted
          src={src ?? undefined}
          alt={name}
          className="size-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback className="text-xs font-semibold tracking-wide text-navy uppercase">
        {inicialesDe(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
