import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-4xl w-full px-8 py-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
            {t("appName")}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto">
            {t("hero.title")}
          </p>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/demo" className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              {t("hero.ctaPrimary")}
            </Link>
            <Link href="/features" className="inline-flex items-center px-8 py-4 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              {t("hero.ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: "señas", title: t("features.señas.title"), desc: t("features.señas.description") },
            { key: "recordatorios", title: t("features.recordatorios.title"), desc: t("features.recordatorios.description") },
            { key: "listaNegra", title: t("features.listaNegra.title"), desc: t("features.listaNegra.description") },
            { key: "agenda", title: t("features.agenda.title"), desc: t("features.agenda.description") },
          ].map((feature) => (
            <div key={feature.key} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-8 py-16">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">{t("pricing.title")}</h2>
          <p className="text-lg text-slate-600 text-center mb-8">{t("pricing.subtitle")}</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{t("pricing.monthly")}</div>
              <div className="text-sm text-slate-500">{t("pricing.trial")}</div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              {(t.raw("pricing.features") as string[]).map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 text-center">
            <Link href="/register" className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              {t("pricing.cta")}
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h3 className="text-xl font-semibold mb-4">¿Listo para probar la demo?</h3>
          <Link href="/demo" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            {t("demo.cta")}
          </Link>
          <p className="text-sm text-slate-400 mt-4">{t("demo.note")}</p>
        </div>
      </div>
    </div>
  );
}