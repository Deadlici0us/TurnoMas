import Link from "next/link";
import { getTranslations } from "next-intl/server";

import DemoCredentials from "@/components/demo-credentials";
import { getDemoCredentials } from "@/lib/auth/demo-credentials";
import { login } from "./actions";

const ERROR_KEYS = {
  credenciales: "auth.invalidCredentials",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
})
{
  const t = await getTranslations("common");
  const { error } = await searchParams;
  const errorKey = error === "credenciales" ? ERROR_KEYS.credenciales : null;
  const demo = getDemoCredentials();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("auth.loginTitle")}</h1>
            <p className="text-sm text-slate-600">{t("auth.loginSubtitle")}</p>
          </div>
          {errorKey !== null && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {t(errorKey)}
            </p>
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
          <div className="text-center space-y-2 text-sm">
            <Link href="/register" className="block text-blue-600 hover:underline">
              {t("auth.toRegister")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
