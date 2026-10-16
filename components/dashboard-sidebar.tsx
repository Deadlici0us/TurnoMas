"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import
{
  BookUser,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Repeat,
  ReceiptText,
  Scissors,
  Settings,
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

const SECCIONES: readonly Seccion[] =
[
  { href: "/dashboard", etiqueta: "Panel", Icono: LayoutDashboard },
  { href: "/dashboard/agenda", etiqueta: "Agenda", Icono: CalendarDays },
  { href: "/dashboard/staff", etiqueta: "Equipo", Icono: Users },
  { href: "/dashboard/servicios", etiqueta: "Servicios", Icono: Scissors },
  { href: "/dashboard/clientes", etiqueta: "Clientes", Icono: BookUser },
  { href: "/dashboard/remarketing", etiqueta: "Remarketing", Icono: Repeat },
  { href: "/dashboard/pagos", etiqueta: "Pagos", Icono: Wallet },
  { href: "/dashboard/config", etiqueta: "Configuración", Icono: Settings },
  { href: "/dashboard/facturacion", etiqueta: "Facturación", Icono: ReceiptText },
];

/**
 * Navegación lateral del panel con sección activa e iconos.
 *
 * Drawer fijo en móvil (botón abrir/cerrar) y columna fija en desktop.
 *
 * @return Navegación de las ocho secciones del panel.
 */
export default function DashboardSidebar({
  pendientesRemarketing,
  bloqueado = false,
}: {
  readonly pendientesRemarketing?: number;
  readonly bloqueado?: boolean;
} = {})
{
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

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
    const base = "flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors";

    if (esActiva(href))
    {
      return `${base} bg-white/10 text-white shadow-[inset_2px_0_0_0_var(--brand-500)]`;
    }

    return `${base} text-slate-400 hover:bg-white/5 hover:text-white`;
  }

  function claseDeshabilitada(): string
  {
    return "flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-slate-500 cursor-not-allowed";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5
          text-slate-200 lg:hidden ${abierto ? "hidden" : ""}`}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {abierto ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      ) : null}
      <aside
        aria-label="Secciones del panel"
        className={`fixed inset-y-0 left-0 z-50 w-[264px] shrink-0 border-r border-white/10 bg-slate-950/95
          p-3 backdrop-blur transition-transform lg:sticky lg:top-14 lg:z-auto lg:h-[calc(100vh-3.5rem)]
          lg:translate-x-0 ${abierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-2 flex items-center justify-between px-1 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Panel
          </span>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {SECCIONES.map(({ href, etiqueta, Icono }) =>
          {
            const deshabilitada = bloqueado && href !== "/dashboard/facturacion";

            const contenido = (
              <>
                <Icono className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {etiqueta}
                {href === "/dashboard/remarketing" && pendientesRemarketing !== undefined && pendientesRemarketing > 0 ? (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/40">
                    {pendientesRemarketing}
                  </span>
                ) : null}
              </>
            );

            if (deshabilitada)
            {
              return (
                <span key={href} aria-disabled="true" className={claseDeshabilitada()}>
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
        </nav>
      </aside>
    </>
  );
}
