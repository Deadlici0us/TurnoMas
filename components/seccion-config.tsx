import type { ReactNode } from "react";
import
{
  BellRing,
  Clock,
  Mail,
  MessageCircle,
  PiggyBank,
  Repeat,
  ShieldAlert,
  Star,
  Store,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Iconos disponibles para las secciones (nombres simples en español). */
export type IconoSeccion =
  | "tienda"
  | "reloj"
  | "escudo"
  | "alcancia"
  | "campana"
  | "estrella"
  | "repetir"
  | "carta"
  | "whatsapp"
  | "billetera"
  | "peligro";

const ICONOS: Readonly<Record<IconoSeccion, LucideIcon>> =
{
  tienda: Store,
  reloj: Clock,
  escudo: ShieldAlert,
  alcancia: PiggyBank,
  campana: BellRing,
  estrella: Star,
  repetir: Repeat,
  carta: Mail,
  whatsapp: MessageCircle,
  billetera: Wallet,
  peligro: Trash2,
};

interface SeccionConfigProps
{
  /** Icono simple de la sección. */
  readonly icono: IconoSeccion;
  /** Título en lenguaje simple. */
  readonly titulo: string;
  /** Ayuda corta de una línea. */
  readonly ayuda: string;
  /** Si es avanzada, se marca opcional y se colapsa. */
  readonly avanzada?: boolean;
  /** Contenido de la sección (formularios). */
  readonly children: ReactNode;
}

/**
 * Tarjeta de configuración con icono, título y ayuda simple.
 *
 * Las secciones esenciales muestran insignia "Paso esencial".
 * Las avanzadas se marcan "Opcional" y arrancan colapsadas con
 * <details> para no abrumar a gente poco tecnológica.
 *
 * @param icono Icono simple de la sección.
 * @param titulo Título en lenguaje simple.
 * @param ayuda Ayuda corta de una línea.
 * @param avanzada Si es avanzada/opcional.
 * @param children Contenido de la sección.
 * @return Tarjeta de sección accesible.
 */
export default function SeccionConfig({ icono, titulo, ayuda, avanzada = false, children }: SeccionConfigProps)
{
  const Icono = ICONOS[icono];
  const insignia = avanzada ? "Opcional" : "Paso esencial";
  const claseInsignia = avanzada
    ? "bg-white/10 text-slate-400 border-white/10"
    : "bg-green-500/10 text-green-300 border-green-500/30";

  const contenido = avanzada
    ? (
      <details className="group rounded-xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-200
          hover:bg-white/5 rounded-xl min-h-[48px] flex items-center">
          Ver opciones avanzadas
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      </details>
    )
    : children;

  return (
    <section
      aria-label={titulo}
      className="bg-slate-900/70 rounded-2xl shadow-black/20 border border-white/10 backdrop-blur p-4 sm:p-6
        space-y-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
            bg-blue-500/15 text-blue-300"
        >
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-100 text-base">
              {titulo}
            </h2>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
              ${claseInsignia}`}>
              {insignia}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {ayuda}
          </p>
        </div>
      </div>
      {contenido}
    </section>
  );
}
