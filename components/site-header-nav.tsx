import Link from "next/link";
import { Scissors } from "lucide-react";

import ProfileMenu from "@/components/profile-menu";

export interface SiteHeaderNavProps
{
  readonly isAuthenticated: boolean;
  readonly businessName: string | null;
  readonly logoUrl: string | null;
  readonly appName: string;
  readonly homeLabel: string;
  readonly loginLabel: string;
  readonly registerLabel: string;
  readonly logoutLabel: string;
  readonly menuLabel: string;
  readonly dashboardLabel: string;
  readonly configLabel: string;
  readonly billingLabel: string;
  readonly accountLabel: string;
  readonly logoutAction: () => void | Promise<void>;
}

/**
 * Barra de navegación global presentacional.
 *
 * Invitados ven login/registro; autenticados, el perfil del negocio con su
 * menú de cuenta (panel, configuración, suscripción y cerrar sesión).
 *
 * @param props autenticación, identidad del negocio, etiquetas i18n y logout.
 * @return Header con marca y acción de cuenta según sesión.
 */
export default function SiteHeaderNav(props: SiteHeaderNavProps)
{
  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-xl"
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8"
        aria-label="Principal"
      >
        <Link
          href={props.isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-bold text-white"
        >
          <span
            className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br
              from-brand-500 to-cyan-400 text-slate-950 shadow-[0_0_20px_-4px_var(--brand-500)]"
          >
            <Scissors className="size-4" aria-hidden="true" />
          </span>
          <span>{props.appName}</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {props.isAuthenticated ? (
            <ProfileMenu
              businessName={props.businessName ?? props.accountLabel}
              logoUrl={props.logoUrl}
              logoutAction={props.logoutAction}
              menuLabel={props.menuLabel}
              dashboardLabel={props.dashboardLabel}
              configLabel={props.configLabel}
              billingLabel={props.billingLabel}
              logoutLabel={props.logoutLabel}
            />
          ) : (
            <>
              <Link
                href="/"
                className="hidden text-slate-300 transition-colors hover:text-white sm:block"
              >
                {props.homeLabel}
              </Link>
              <Link href="/login" className="text-slate-300 transition-colors hover:text-white">
                {props.loginLabel}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white
                  shadow-[0_0_28px_-8px_var(--brand-500)] transition-colors hover:bg-brand-500"
              >
                {props.registerLabel}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
