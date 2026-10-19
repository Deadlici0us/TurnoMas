import { useTranslations } from "next-intl";
import { BellRing, CalendarDays, CreditCard, ShieldCheck } from "lucide-react";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

export default function FeaturesPage()
{
  const t = useTranslations("common");

  const features = [
    { key: "señas", title: t("features.señas.title"), desc: t("features.señas.description"),
      Icon: CreditCard, tone: "bg-info-soft text-primary" },
    { key: "recordatorios", title: t("features.recordatorios.title"),
      desc: t("features.recordatorios.description"), Icon: BellRing,
      tone: "bg-success-soft text-[#0c6b45]" },
    { key: "listaNegra", title: t("features.listaNegra.title"),
      desc: t("features.listaNegra.description"), Icon: ShieldCheck,
      tone: "bg-danger-soft text-danger" },
    { key: "agenda", title: t("features.agenda.title"), desc: t("features.agenda.description"),
      Icon: CalendarDays, tone: "bg-warning-soft text-[#8a5b00]" },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Funciones</p>
          <h1 className="animate-reveal-up mt-2 font-heading text-4xl font-extrabold tracking-tight text-navy">
            {t("appName")}
          </h1>
          <p className="animate-reveal-up mt-3 text-muted-foreground" style={{ animationDelay: "80ms" }}>
            Todo lo que necesitás para organizar turnos, cobrar señas y reducir ausencias.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {features.map(({ key, title, desc, Icon, tone }, index) => (
            <article
              key={key}
              className="animate-reveal-up ui-card ui-card-hover p-6"
              style={{ animationDelay: `${Math.min(index * 80, 320)}ms` }}
            >
              <span className={`inline-flex size-11 items-center justify-center rounded-full ${tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-heading text-lg font-bold text-navy">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
