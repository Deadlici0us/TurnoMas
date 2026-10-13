import Link from "next/link";
import { getTranslations } from "next-intl/server";

import AuthCard from "@/components/auth-card";
import SocialLoginButton from "@/components/social-login-button";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { register } from "./actions";

const ERROR_KEYS = {
  datos: "auth.invalidData",
  registro: "auth.registerError",
} as const;

type ErrorParam = keyof typeof ERROR_KEYS;

function isErrorParam(value: string | undefined): value is ErrorParam
{
  return value === "datos" || value === "registro";
}

export default async function RegisterPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
})
{
  const t = await getTranslations("common");
  const { error } = await searchParams;
  const showSocialLogin = resolveAuthMode() === "supabase";

  return (
    <AuthCard
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      error={isErrorParam(error) ? t(ERROR_KEYS[error]) : null}
      footer={(
        <Link href="/login" className="text-brand-400 hover:text-brand-500 hover:underline">
          {t("auth.toLogin")}
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
      <form className="space-y-4" action={register}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t("auth.businessName")}
          </label>
          <input
            type="text"
            name="business"
            required
            minLength={2}
            placeholder={t("auth.businessNamePlaceholder")}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl outline-none
              placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
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
          {t("auth.registerCta")}
        </button>
      </form>
    </AuthCard>
  );
}
