import Link from "next/link";
import { useTranslations } from "next-intl";

import LossCalculator from "@/components/loss-calculator";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent">
      <div className="max-w-4xl w-full px-8 py-12">
        <div className="text-center space-y-6">
          <p className="animate-reveal-up inline-flex items-center gap-2 rounded-full border border-white/10
            bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-widest text-slate-300 uppercase
            backdrop-blur" style={{ animationDelay: "0ms" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.9)]" />{" "}
            Reservas con seña para profesionales
          </p>
          <h1 className="animate-reveal-up text-4xl md:text-6xl font-bold tracking-tight text-white"
            style={{ animationDelay: "80ms" }}>
            {t("appName")}
          </h1>
          <p className="animate-reveal-up text-xl md:text-2xl font-semibold max-w-2xl mx-auto
            bg-gradient-to-r from-brand-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent"
            style={{ animationDelay: "160ms" }}>
            {t("hero.title")}
          </p>
          <p className="animate-reveal-up text-lg text-slate-400 max-w-xl mx-auto"
            style={{ animationDelay: "220ms" }}>
            {t("hero.subtitle")}
          </p>
          <div className="animate-reveal-up flex flex-col sm:flex-row gap-4 justify-center mt-8"
            style={{ animationDelay: "300ms" }}>
            <Link href="/login" className="group relative inline-flex items-center justify-center overflow-hidden
              px-8 py-4 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-500
              shadow-[0_0_36px_-6px_var(--brand-500)] transition-all duration-300 hover:-translate-y-0.5">
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
                bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
              {t("hero.ctaPrimary")}
            </Link>
            <Link href="/features" className="inline-flex items-center justify-center px-8 py-4
              border border-white/15 text-white font-semibold rounded-xl backdrop-blur
              hover:bg-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5">
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
          ].map((feature, index) => (
            <div key={feature.key}
              className="animate-reveal-up rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl
                shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] transition-all duration-300
                hover:-translate-y-1.5 hover:border-brand-500/40 hover:shadow-[0_16px_48px_-12px_var(--brand-500)]"
              style={{ animationDelay: `${Math.min(index * 90, 360)}ms` }}>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <LossCalculator />

      <div className="w-full max-w-4xl mx-auto px-8 py-16">
        <div className="animate-reveal-up rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl
          shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">{t("pricing.title")}</h2>
          <p className="text-lg text-slate-400 text-center mb-8">{t("pricing.subtitle")}</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-cyan-300
                bg-clip-text text-transparent">{t("pricing.monthly")}</div>
              <div className="text-sm text-slate-400">{t("pricing.trial")}</div>
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              {(t.raw("pricing.features") as string[]).map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 text-center">
            <Link href="/register" className="group relative inline-flex items-center overflow-hidden px-8 py-3
              bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-500
              shadow-[0_0_36px_-6px_var(--brand-500)] transition-all duration-300 hover:-translate-y-0.5">
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
                bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
              {t("pricing.cta")}
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-white/10 bg-white/[0.02] py-12 backdrop-blur">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h3 className="text-xl font-semibold mb-4 text-white">¿Listo para entrar con la cuenta demo?</h3>
          <Link href="/login" className="inline-flex items-center px-6 py-3 bg-brand-600 text-white
            font-semibold rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
            transition-all duration-300 hover:-translate-y-0.5">
            {t("auth.loginCta")}
          </Link>
          <p className="text-sm text-slate-400 mt-4">{t("demo.note")}</p>
        </div>
      </div>
    </div>
  );
}