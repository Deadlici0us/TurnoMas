import Link from "next/link";
import { getTranslations } from "next-intl/server";

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-md w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("auth.registerTitle")}</h1>
            <p className="text-sm text-slate-600">{t("auth.registerSubtitle")}</p>
          </div>
          {isErrorParam(error) && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {t(ERROR_KEYS[error])}
            </p>
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
          <div className="text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              {t("auth.toLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
