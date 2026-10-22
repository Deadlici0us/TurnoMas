import Link from "next/link";
import { getTranslations } from "next-intl/server";

import AuthCard from "@/components/auth-card";
import SocialLoginButton from "@/components/social-login-button";
import { resolveAuthMode } from "@/lib/auth/auth-mode";
import { register } from "./actions";

const ERROR_KEYS = {
  datos: "auth.invalidData",
  registro: "auth.registerError",
  inesperado: "auth.unexpectedError",
} as const;

type ErrorParam = keyof typeof ERROR_KEYS;

function isErrorParam(value: string | undefined): value is ErrorParam
{
  return value === "datos" || value === "registro" || value === "inesperado";
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
        <Link href="/login" className="ui-link">
          {t("auth.toLogin")}
        </Link>
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
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex-1 border-t border-line" />
            {t("auth.useEmailInstead")}
            <span className="flex-1 border-t border-line" />
          </div>
        </>
      )}
      <form className="space-y-4" action={register}>
        <div>
          <label className="ui-label mb-1">
            {t("auth.businessName")}
          </label>
          <input
            type="text"
            name="business"
            required
            minLength={2}
            placeholder={t("auth.businessNamePlaceholder")}
            className="ui-input h-11"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            className="ui-input h-11"
          />
        </div>
        <button
          type="submit"
          className="ui-btn ui-btn-cta w-full"
        >
          {t("auth.registerCta")}
        </button>
      </form>
    </AuthCard>
  );
}
