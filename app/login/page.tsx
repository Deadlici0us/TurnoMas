import Link from "next/link";
import { getTranslations } from "next-intl/server";

import AuthCard from "@/components/auth-card";
import DemoCredentials from "@/components/demo-credentials";
import SocialLoginButton from "@/components/social-login-button";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { login } from "./actions";

const ERROR_KEYS = {
  credenciales: "auth.invalidCredentials",
  oauth: "auth.oauthError",
  sesion: "auth.sessionExpired",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
})
{
  const t = await getTranslations("common");
  const { error } = await searchParams;
  const errorKey = error === "credenciales" || error === "oauth" || error === "sesion"
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
        <Link href="/register" className="block text-blue-600 hover:underline">
          {t("auth.toRegister")}
        </Link>
      )}
    >
      {showSocialLogin && (
        <>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">{t("auth.googleTitle")}</p>
            <p className="text-xs text-slate-600">{t("auth.googleHint")}</p>
            <SocialLoginButton
              label={t("auth.continueWithGoogle")}
              errorLabel={t("auth.oauthError")}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex-1 border-t border-slate-200" />
            {t("auth.useEmailInstead")}
            <span className="flex-1 border-t border-slate-200" />
          </div>
        </>
      )}
      <form className="space-y-4" action={login}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("auth.email")}</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("auth.password")}</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          {t("auth.loginCta")}
        </button>
      </form>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">{t("auth.demoTitle")}</p>
          <p className="text-xs text-slate-500">{t("auth.demoSubtitle")}</p>
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
