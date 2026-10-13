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
  readonly searchParams: Promise<{ error?: string }>;
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
        <Link href="/register" className="block text-brand-400 hover:text-brand-500 hover:underline">
          {t("auth.toRegister")}
        </Link>
      )}
    >
      {showSocialLogin && (
        <>
          <div className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-4 space-y-3">
            <p className="text-sm font-semibold text-white">{t("auth.googleTitle")}</p>
            <p className="text-xs text-slate-400">{t("auth.googleHint")}</p>
            <SocialLoginButton
              label={t("auth.continueWithGoogle")}
              errorLabel={t("auth.oauthError")}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex-1 border-t border-white/10" />
            {t("auth.useEmailInstead")}
            <span className="flex-1 border-t border-white/10" />
          </div>
        </>
      )}
      <form className="space-y-4" action={login}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">{t("auth.email")}</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
              placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">{t("auth.password")}</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
              placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
        </div>
        <button
          type="submit"
          className="group relative w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
            rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
            transition-all duration-300"
        >
          <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
            bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
          {t("auth.loginCta")}
        </button>
      </form>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="text-center">
          <p className="text-sm font-medium text-white">{t("auth.demoTitle")}</p>
          <p className="text-xs text-slate-400">{t("auth.demoSubtitle")}</p>
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
