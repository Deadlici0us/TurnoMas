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
    <header className="w-full border-b border-slate-200 bg-white">
      <nav className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between" aria-label="Principal">
        <Link href="/" className="font-bold text-slate-900">
          {props.appName}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            {props.homeLabel}
          </Link>
          {props.isAuthenticated ? (
            <form action={props.logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                {props.logoutLabel}
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                {props.loginLabel}
              </Link>
              <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {props.registerLabel}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
