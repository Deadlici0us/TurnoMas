import { useTranslations } from "next-intl";

export default function FeaturesPage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t("appName")}</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { key: "señas", title: t("features.señas.title"), desc: t("features.señas.description") },
            { key: "recordatorios", title: t("features.recordatorios.title"), desc: t("features.recordatorios.description") },
            { key: "listaNegra", title: t("features.listaNegra.title"), desc: t("features.listaNegra.description") },
            { key: "agenda", title: t("features.agenda.title"), desc: t("features.agenda.description") },
          ].map((feature) => (
            <div key={feature.key} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h2>
              <p className="text-sm text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}