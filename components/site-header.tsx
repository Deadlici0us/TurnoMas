import { getTranslations } from "next-intl/server";

import SiteHeaderNav from "@/components/site-header-nav";
import { logout } from "@/app/login/actions";
import { getNegocioHeader } from "@/lib/dashboard/negocio-header";
import { getSessionState } from "@/lib/auth/session";
import { esSesionDemo } from "@/lib/auth/demo-session";

/**
 * Header global del sitio (Server Component).
 *
 * Resuelve sesión e identidad del negocio y delega el render a
 * `SiteHeaderNav`. La consulta de negocio solo ocurre con sesión activa.
 *
 * @return Barra de navegación con cuenta o login/registro.
 */
export default async function SiteHeader()
{
  const t = await getTranslations("common");
  const state = await getSessionState();
  const isAuthenticated = state === "authenticated";
  const demo = isAuthenticated && await esSesionDemo();
  const negocio = isAuthenticated ? await getNegocioHeader() : null;

  return (
    <SiteHeaderNav
      isAuthenticated={isAuthenticated}
      businessName={negocio?.nombre ?? null}
      logoUrl={negocio?.logoUrl ?? null}
      appName={t("appName")}
      homeLabel={t("nav.home")}
      loginLabel={t("nav.login")}
      registerLabel={t("nav.register")}
      logoutLabel={t("auth.logoutCta")}
      menuLabel={t("nav.menu")}
      billingLabel={t("nav.billing")}
      accountLabel={t("nav.account")}
      mostrarFacturacion={!demo}
      logoutAction={logout}
    />
  );
}
