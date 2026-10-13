import { useTranslations } from "next-intl";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="max-w-4xl w-full px-8 py-12">
        <h1 className="animate-reveal-up text-3xl font-bold text-white mb-8 text-center">{t("appName")}</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { key: "señas", title: t("features.señas.title"), desc: t("features.señas.description") },
            { key: "recordatorios", title: t("features.recordatorios.title"), desc: t("features.recordatorios.description") },
            { key: "listaNegra", title: t("features.listaNegra.title"), desc: t("features.listaNegra.description") },
            { key: "agenda", title: t("features.agenda.title"), desc: t("features.agenda.description") },
          ].map((feature, index) => (
            <div key={feature.key}
              className="animate-reveal-up rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl
                transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40"
              style={{ animationDelay: `${Math.min(index * 90, 360)}ms` }}>
              <h2 className="text-lg font-semibold text-white mb-2">{feature.title}</h2>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}