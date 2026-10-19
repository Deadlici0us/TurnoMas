import type { ReactNode } from "react";
import
{
  BellRing,
  ChevronDown,
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
  const claseInsignia = avanzada ? "ui-badge-neutral" : "ui-badge-success";

  const contenido = avanzada
    ? (
      <details className="group rounded-lg border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between
          rounded-lg px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-soft">
          Ver opciones avanzadas
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200
            group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="animate-fade-in space-y-3 px-4 pb-4">
          {children}
        </div>
      </details>
    )
    : children;

  return (
    <section aria-label={titulo} className="ui-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full
            bg-info-soft text-primary"
        >
          <Icono className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="ui-section-title">{titulo}</h2>
            <span className={`ui-badge ${claseInsignia}`}>{insignia}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ayuda}</p>
        </div>
      </div>
      {contenido}
    </section>
  );
}
