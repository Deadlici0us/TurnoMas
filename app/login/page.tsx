import Link from "next/link";
import { getTranslations } from "next-intl/server";

import AuthCard from "@/components/auth-card";
import DemoCredentials from "@/components/demo-credentials";
import LegalLinks from "@/components/legal-links";
import SocialLoginButton from "@/components/social-login-button";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { login } from "./actions";

const ERROR_KEYS = {
  credenciales: "auth.invalidCredentials",
  oauth: "auth.oauthError",
  sesion: "auth.sessionExpired",
  inesperado: "auth.unexpectedError",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
})
{
  const t = await getTranslations("common");
  const { error } = await searchParams;
  const errorKey = error === "credenciales" || error === "oauth" || error === "sesion"
    || error === "inesperado"
    ? ERROR_KEYS[error]
    : null;
  const demo = getDemoCredentials();
  const showSocialLogin = resolveAuthMode() === "supabase";

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      error={errorKey !== null ? t(errorKey) : null}
      footer={(
        <div className="space-y-2">
          <Link href="/register" className="block ui-link">
            {t("auth.toRegister")}
          </Link>
          <LegalLinks
            privacyLabel={t("footer.privacy")}
            termsLabel={t("footer.terms")}
          />
        </div>
      )}
    >
      {showSocialLogin && (
        <>
          <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">{t("auth.googleTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("auth.googleHint")}</p>
            <SocialLoginButton
              label={t("auth.continueWithGoogle")}
              errorLabel={t("auth.oauthError")}
              clientId={process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex-1 border-t border-line" />
            {t("auth.useEmailInstead")}
            <span className="flex-1 border-t border-line" />
          </div>
        </>
      )}
      <form className="space-y-4" action={login}>
        <div>
          <label className="ui-label mb-1">{t("auth.email")}</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="ui-input h-11"
          />
        </div>
        <div>
          <label className="ui-label mb-1">{t("auth.password")}</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="ui-input h-11"
          />
        </div>
        <button
          type="submit"
          className="ui-btn ui-btn-cta w-full"
        >
          {t("auth.loginCta")}
        </button>
      </form>
      <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">{t("auth.demoTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("auth.demoSubtitle")}</p>
        </div>
        <DemoCredentials
          email={demo.email}
          password={demo.password}
          emailLabel={t("auth.demoEmail")}
          passwordLabel={t("auth.demoPassword")}
          copyLabel={t("auth.copy")}
          copiedLabel={t("auth.copied")}
        />
      </div>
    </AuthCard>
  );
}
