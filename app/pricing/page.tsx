import { getTranslations } from "next-intl/server";
import Link from "next/link";

// next-intl sin segmento [locale]: el prerender estático no tiene
// contexto de request y revienta con ENVIRONMENT_FALLBACK. On-demand.
export const dynamic = "force-dynamic";

export default async function PricingPage(
  props?: { readonly searchParams?: Promise<{ blocked?: string }> },
) {
  const t = await getTranslations("common");
  const params = props?.searchParams === undefined ? undefined : await props.searchParams;
  const bloqueado = params?.blocked === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="max-w-4xl w-full px-8 py-12">
        <h1 className="animate-reveal-up text-3xl font-bold text-white mb-2 text-center">{t("pricing.title")}</h1>
        <p className="animate-reveal-up text-lg text-slate-400 text-center mb-8"
          style={{ animationDelay: "80ms" }}>{t("pricing.subtitle")}</p>
        {bloqueado && (
          <p className="text-sm font-semibold px-4 py-3 rounded-xl border mb-6 max-w-lg mx-auto
            bg-rose-500/10 text-rose-300 border-rose-500/30 text-center">
            Tu acceso está bloqueado por falta de pago. Activá el plan para continuar.
          </p>
        )}
        <div className="animate-reveal-up rounded-2xl border border-white/10 bg-white/5 p-8 max-w-lg mx-auto
          backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]"
          style={{ animationDelay: "160ms" }}>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold bg-gradient-to-r from-brand-400 to-cyan-300
              bg-clip-text text-transparent">{t("pricing.monthly")}</div>
            <div className="text-sm text-slate-400">{t("pricing.trial")}</div>
          </div>
          <ul className="space-y-3 mb-8">
            {["Reservas ilimitadas", "Cobro de señas vía MercadoPago", "Recordatorios por WhatsApp y email", "Lista negra automática", "Agenda sincronizada con Google Calendar", "Soporte prioritario"].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="text-center">
            <Link
              href="/dashboard/facturacion"
              className="group relative block w-full overflow-hidden bg-brand-600 text-white font-semibold py-3
                rounded-xl hover:bg-brand-500 shadow-[0_0_36px_-6px_var(--brand-500)]
                transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3
                bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
              {t("pricing.cta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
