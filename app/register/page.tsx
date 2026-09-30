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
  searchParams: Promise<{ error?: string }>;
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
        <Link href="/login" className="text-blue-600 hover:underline">
          {t("auth.toLogin")}
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
      <form className="space-y-4" action={register}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("auth.businessName")}
          </label>
          <input
            type="text"
            name="business"
            required
            minLength={2}
            placeholder={t("auth.businessNamePlaceholder")}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          {t("auth.registerCta")}
        </button>
      </form>
    </AuthCard>
  );
}
