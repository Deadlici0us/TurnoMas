import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Check } from "lucide-react";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

const BENEFICIOS = [
  "Reservas ilimitadas",
  "Cobro de señas vía MercadoPago",
  "Recordatorios automáticos por email",
  "Lista negra automática",
  "Agenda sincronizada con Google Calendar",
  "Soporte prioritario",
] as const;

export default async function PricingPage()
{
  const t = await getTranslations("common");

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Precios</p>
          <h1 className="animate-reveal-up mt-2 font-heading text-4xl font-extrabold tracking-tight text-navy">
            {t("pricing.title")}
          </h1>
          <p className="animate-reveal-up mt-3 text-lg text-muted-foreground"
            style={{ animationDelay: "80ms" }}>
            {t("pricing.subtitle")}
          </p>
        </div>
        <div className="animate-reveal-up ui-card mx-auto mt-10 max-w-lg p-6 sm:p-8"
          style={{ animationDelay: "160ms" }}>
          <div className="mb-6 text-center">
            <div className="font-heading text-4xl font-extrabold text-navy">{t("pricing.monthly")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t("pricing.trial")}</div>
          </div>
          <ul className="mb-8 space-y-3">
            {BENEFICIOS.map((beneficio) => (
              <li key={beneficio} className="flex items-center gap-2 text-sm text-ink">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full
                  bg-success-soft text-[#0c6b45]">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {beneficio}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/suscripcion" className="ui-btn ui-btn-cta w-full">
            {t("pricing.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
