import { getTranslations } from "next-intl/server";

import SiteHeaderNav from "@/components/site-header-nav";
import { logout } from "@/app/login/actions";
import { getSessionState } from "@/lib/auth/session";

/**
 * Header global del sitio (Server Component).
 *
 * Lee la sesión y delega el render a `SiteHeaderNav`.
 *
 * @return Barra de navegación con login/registro o cerrar sesión.
 */
export default async function SiteHeader()
{
  const t = await getTranslations("common");
  const state = await getSessionState();

  return (
    <SiteHeaderNav
      isAuthenticated={state === "authenticated"}
      appName={t("appName")}
      homeLabel={t("nav.home")}
      loginLabel={t("nav.login")}
      registerLabel={t("nav.register")}
      logoutLabel={t("auth.logoutCta")}
      logoutAction={logout}
    />
  );
}
