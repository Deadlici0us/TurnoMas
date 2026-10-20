"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import
{
  BadgePercent,
  BookUser,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Repeat,
  Settings,
  Star,
  Tags,
  Users,
  Wallet,
  X,
} from "lucide-react";

interface Seccion
{
  readonly href: string;
  readonly etiqueta: string;
  readonly Icono: typeof LayoutDashboard;
}

interface Grupo
{
  readonly titulo: string;
  readonly items: readonly Seccion[];
}

const GRUPOS: readonly Grupo[] =
[
  {
    titulo: "Principal",
    items: [
      { href: "/dashboard", etiqueta: "Panel", Icono: LayoutDashboard },
      { href: "/dashboard/agenda", etiqueta: "Agenda", Icono: CalendarDays },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/dashboard/staff", etiqueta: "Equipo", Icono: Users },
      { href: "/dashboard/servicios", etiqueta: "Servicios", Icono: Tags },
      { href: "/dashboard/clientes", etiqueta: "Clientes", Icono: BookUser },
      { href: "/dashboard/resenas", etiqueta: "Reseñas", Icono: Star },
      { href: "/dashboard/remarketing", etiqueta: "Remarketing", Icono: Repeat },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/dashboard/pagos", etiqueta: "Pagos", Icono: Wallet },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { href: "/dashboard/config", etiqueta: "Configuración", Icono: Settings },
    ],
  },
];

const CLASE_DESHABILITADA =
  "flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-semibold text-white/35 cursor-not-allowed";

/**
 * Devuelve el contador de pendientes que corresponde a una sección.
 *
 * @param href Ruta de la sección.
 * @param pendientesRemarketing Pendientes del módulo de remarketing.
 * @param resenasPendientes Reseñas pendientes de moderación.
 * @return Conteo de pendientes, o undefined si la sección no tiene contador.
 */
function pendientesDeSeccion(
  href: string,
  pendientesRemarketing: number | undefined,
  resenasPendientes: number | undefined,
): number | undefined
{
  if (href === "/dashboard/remarketing")
  {
    return pendientesRemarketing;
  }

  if (href === "/dashboard/resenas")
  {
    return resenasPendientes;
  }

  return undefined;
}

/**
 * Navegación lateral del panel con grupos estilo SimplyBook.
 *
 * Drawer fijo en móvil (botón abrir/cerrar) y columna fija en desktop.
 *
 * @return Navegación agrupada del panel.
 */
export default function DashboardSidebar({
  pendientesRemarketing,
  resenasPendientes,
  bloqueado = false,
  esAdmin = false,
}: {
  readonly pendientesRemarketing?: number;
  readonly resenasPendientes?: number;
  readonly bloqueado?: boolean;
  readonly esAdmin?: boolean;
} = {})
{
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const grupos: readonly Grupo[] = esAdmin
    ? GRUPOS.map((grupo) => grupo.titulo === "Sistema"
      ? {
        ...grupo,
        items: [...grupo.items, {
          href: "/admin/promociones",
          etiqueta: "Promociones",
          Icono: BadgePercent,
        }],
      }
      : grupo)
    : GRUPOS;

  function esActiva(href: string): boolean
  {
    if (href === "/dashboard")
    {
      return ruta === "/dashboard";
    }

    return ruta === href || ruta.startsWith(`${href}/`);
  }

  function claseLink(href: string): string
  {
    const base = "flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-semibold transition-colors duration-200";

    if (esActiva(href))
    {
      return `${base} bg-primary text-white shadow-[0_6px_16px_-8px_rgba(6,173,239,0.9)]`;
    }

    return `${base} text-white/75 hover:bg-white/[0.08] hover:text-white`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className={`fixed left-4 top-[72px] z-30 inline-flex h-10 w-10 items-center justify-center
          rounded-full border border-line bg-white text-navy shadow-[var(--shadow-card)]
          transition-colors hover:bg-soft lg:hidden ${abierto ? "hidden" : ""}`}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {abierto ? (
        <div
          className="fixed inset-0 z-40 bg-navy/45 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      ) : null}
      <aside
        aria-label="Secciones del panel"
        className={`fixed inset-y-0 left-0 z-50 w-[264px] shrink-0 overflow-y-auto bg-sidebar
          px-2 py-3 transition-transform duration-300 lg:sticky lg:top-[60px] lg:z-auto
          lg:h-[calc(100vh-60px)] lg:w-[210px] lg:translate-x-0
          ${abierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-3 flex items-center justify-between px-2 lg:hidden">
          <span className="font-heading text-sm font-bold tracking-wider text-white uppercase">
            Menú
          </span>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80
              transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="pb-2">
              <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em]
                text-white/40 uppercase">
                {grupo.titulo}
              </p>
              <div className="flex flex-col gap-0.5">
                {grupo.items.map(({ href, etiqueta, Icono }) =>
                {
                  const deshabilitada = bloqueado && href !== "/admin/promociones";
                  const pendientes = pendientesDeSeccion(href, pendientesRemarketing, resenasPendientes);

                  const contenido = (
                    <>
                      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{etiqueta}</span>
                      {pendientes !== undefined && pendientes > 0 ? (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center
                          rounded-full bg-cta px-1.5 text-[10px] font-bold text-white">
                          {pendientes}
                        </span>
                      ) : null}
                    </>
                  );

                  if (deshabilitada)
                  {
                    return (
                      <span key={href} aria-disabled="true" className={CLASE_DESHABILITADA}>
                        {contenido}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setAbierto(false)}
                      aria-current={esActiva(href) ? "page" : undefined}
                      className={claseLink(href)}
                    >
                      {contenido}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-2 mt-4 rounded-lg border border-sidebar-border bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold text-white">¿Necesitás ayuda?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/60">
            Visitá la configuración para conectar pagos y tu calendario.
          </p>
          <Link
            href="/dashboard/config"
            className="mt-2 inline-flex text-[11px] font-semibold text-primary hover:underline"
          >
            Ir a configuración
          </Link>
        </div>
      </aside>
    </>
  );
}
