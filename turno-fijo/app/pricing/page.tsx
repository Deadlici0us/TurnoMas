import { useTranslations } from "next-intl";

export default function PricingPage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">{t("pricing.title")}</h1>
        <p className="text-lg text-slate-600 text-center mb-8">{t("pricing.subtitle")}</p>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-blue-600">{t("pricing.monthly")}</div>
            <div className="text-sm text-slate-500">{t("pricing.trial")}</div>
          </div>
          <ul className="space-y-3 mb-8">
            {["Reservas ilimitadas", "Cobro de señas vía MercadoPago", "Recordatorios por WhatsApp y email", "Lista negra automática", "Agenda sincronizada con Google Calendar", "Soporte prioritario"].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="text-center">
            <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
              {t("pricing.cta")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}