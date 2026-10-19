import Link from "next/link";
import { CalendarClock } from "lucide-react";

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
 * @return Header blanco con marca y acción de cuenta según sesión.
 */
export default function SiteHeaderNav(props: SiteHeaderNavProps)
{
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-white/95 backdrop-blur">
      <nav
        className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Principal"
      >
        <Link
          href={props.isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 text-navy"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-white">
            <CalendarClock className="size-4" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-extrabold tracking-tight">{props.appName}</span>
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
                className="hidden text-ink transition-colors hover:text-primary sm:block"
              >
                {props.homeLabel}
              </Link>
              <Link
                href="/login"
                className="px-2 py-2 font-semibold text-navy transition-colors hover:text-primary"
              >
                {props.loginLabel}
              </Link>
              <Link href="/register" className="ui-btn ui-btn-cta ui-btn-sm">
                {props.registerLabel}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
