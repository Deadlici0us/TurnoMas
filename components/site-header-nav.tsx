import Link from "next/link";

export interface SiteHeaderNavProps
{
  readonly isAuthenticated: boolean;
  readonly appName: string;
  readonly homeLabel: string;
  readonly loginLabel: string;
  readonly registerLabel: string;
  readonly logoutLabel: string;
  readonly logoutAction: () => void | Promise<void>;
}

/**
 * Barra de navegación global presentacional (server-compatible).
 *
 * @param props autenticación, etiquetas i18n y Server Action de logout.
 * @return Header con links de login/registro o botón de cerrar sesión.
 */
export default function SiteHeaderNav(props: SiteHeaderNavProps)
{
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <nav className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between" aria-label="Principal">
        <Link href="/" className="font-bold text-white">
          {props.appName}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-slate-300 hover:text-white">
            {props.homeLabel}
          </Link>
          {props.isAuthenticated ? (
            <form action={props.logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 border border-white/20 rounded-lg text-slate-200 hover:bg-white/10"
              >
                {props.logoutLabel}
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-slate-300 hover:text-white">
                {props.loginLabel}
              </Link>
              <Link href="/register" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500">
                {props.registerLabel}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
