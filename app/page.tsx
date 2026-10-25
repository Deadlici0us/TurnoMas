import Link from "next/link";
import { useTranslations } from "next-intl";
import
{
  BellRing,
  CalendarDays,
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import LossCalculator from "@/components/loss-calculator";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

export default function HomePage()
{
  const t = useTranslations("common");

  const features = [
    {
      key: "señas",
      title: t("features.señas.title"),
      desc: t("features.señas.description"),
      Icon: CreditCard,
      tone: "bg-info-soft text-primary",
    },
    {
      key: "recordatorios",
      title: t("features.recordatorios.title"),
      desc: t("features.recordatorios.description"),
      Icon: BellRing,
      tone: "bg-success-soft text-[#0c6b45]",
    },
    {
      key: "listaNegra",
      title: t("features.listaNegra.title"),
      desc: t("features.listaNegra.description"),
      Icon: ShieldCheck,
      tone: "bg-danger-soft text-danger",
    },
    {
      key: "agenda",
      title: t("features.agenda.title"),
      desc: t("features.agenda.description"),
      Icon: CalendarDays,
      tone: "bg-warning-soft text-[#8a5b00]",
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-20">
          <div>
            <p className="animate-reveal-up inline-flex items-center gap-2 rounded-full border border-line
              bg-white px-4 py-1.5 text-xs font-semibold tracking-widest text-navy uppercase">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              Reservas con seña para profesionales
            </p>
            <h1 className="animate-reveal-up mt-5 font-heading text-4xl leading-tight font-extrabold
              tracking-tight text-navy sm:text-5xl lg:text-[56px]" style={{ animationDelay: "60ms" }}>
              {t("appName")}
            </h1>
            <p className="animate-reveal-up mt-4 max-w-xl font-heading text-xl font-bold text-primary
              sm:text-2xl" style={{ animationDelay: "120ms" }}>
              {t("hero.title")}
            </p>
            <p className="animate-reveal-up mt-4 max-w-xl text-base leading-relaxed text-muted-foreground
              sm:text-lg" style={{ animationDelay: "180ms" }}>
              {t("hero.subtitle")}
            </p>
            <div className="animate-reveal-up mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "240ms" }}>
              <Link href="/login" className="ui-btn ui-btn-cta ui-btn-lg">
                {t("hero.ctaPrimary")}
              </Link>
              <Link href="/features" className="ui-btn ui-btn-outline ui-btn-lg">
                {t("hero.ctaSecondary")}
              </Link>
            </div>
            <div className="animate-reveal-up mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm
              text-muted-foreground" style={{ animationDelay: "300ms" }}>
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-warning text-warning" aria-hidden="true" />
                4.8/5 en atención
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-primary" aria-hidden="true" />
                Hecho para profesionales independientes
              </span>
            </div>
          </div>

          <div className="animate-reveal-up" style={{ animationDelay: "180ms" }}>
            <div className="ui-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-danger" />
                  <span className="size-2.5 rounded-full bg-warning" />
                  <span className="size-2.5 rounded-full bg-success" />
                </div>
                <span className="font-heading text-sm font-bold text-navy">Agenda de hoy</span>
                <span className="ui-badge ui-badge-info">6 turnos</span>
              </div>
              <div className="grid grid-cols-[54px_1fr] gap-px bg-line">
                <div className="space-y-0 bg-surface py-3">
                  {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map((hora) => (
                    <div key={hora} className="h-12 pr-2 text-right font-mono text-[10px]
                      text-muted-foreground">
                      {hora}
                    </div>
                  ))}
                </div>
                <div className="relative space-y-2 bg-white p-3">
                  <div className="ml-1 h-11 w-4/5 rounded-md border border-info/30 border-l-4
                    border-l-info bg-info-soft px-3 py-2 text-xs font-semibold text-[#0b5f7f]">
                    Juan · Corte
                  </div>
                  <div className="ml-10 h-11 w-3/5 rounded-md border border-success/30 border-l-4
                    border-l-success bg-success-soft px-3 py-2 text-xs font-semibold text-[#0c6b45]">
                    Ana · Color
                  </div>
                  <div className="ml-3 h-11 w-2/3 rounded-md border border-warning/40 border-l-4
                    border-l-warning bg-warning-soft px-3 py-2 text-xs font-semibold text-[#7a5200]">
                    Leo · Barba
                  </div>
                  <div className="ml-16 h-11 w-1/2 rounded-md border border-danger/30 border-l-4
                    border-l-danger bg-danger-soft px-3 py-2 text-xs font-semibold text-[#a3122f]">
                    Seña pendiente
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-3">
                <span className="text-xs text-muted-foreground">Hoy</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                  <Check className="size-4" aria-hidden="true" />
                  Todo confirmado
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">Funciones</p>
              <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-navy">
                Todo lo que necesitás para llenar tu agenda
              </h2>
              <p className="mt-3 text-muted-foreground">
                Menos ausencias, más tiempo para tus clientes y una operación simple de entender.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ key, title, desc, Icon, tone }, index) => (
                <article
                  key={key}
                  className="animate-reveal-up ui-card ui-card-hover p-6"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className={`inline-flex size-11 items-center justify-center rounded-full ${tone}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-heading text-base font-bold text-navy">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <LossCalculator />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="animate-reveal-up ui-card p-6 text-center sm:p-10">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Precio simple</p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-navy">
              {t("pricing.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("pricing.subtitle")}</p>
            <div className="mt-6 font-heading text-4xl font-extrabold text-navy">
              {t("pricing.monthly")}
            </div>
            <div className="text-sm text-muted-foreground">{t("pricing.trial")}</div>
            <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
              {(t.raw("pricing.features") as string[]).map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-ink">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full
                    bg-success-soft text-[#0c6b45]">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/register" className="ui-btn ui-btn-cta ui-btn-lg mt-8">
              {t("pricing.cta")}
            </Link>
          </div>
        </section>

        <section className="bg-navy py-14">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
              Empezá tu prueba gratis
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
              14 días gratis, sin tarjeta. Armá tu agenda y empezá a recibir reservas con seña.
            </p>
            <Link href="/register" className="ui-btn ui-btn-cta ui-btn-lg mt-6">
              {t("auth.registerCta")}
            </Link>
          </div>
        </section>

        <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3
          px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>{t("appName")}</span>
          <span>Reservas, señas y recordatorios en un solo lugar.</span>
          <nav className="flex items-center gap-4" aria-label="Legal">
            <Link href="/privacidad" className="transition-colors hover:text-primary">
              {t("footer.privacy")}
            </Link>
            <Link href="/terminos" className="transition-colors hover:text-primary">
              {t("footer.terms")}
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
