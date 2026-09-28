import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("appName")}</h1>
          <div className="space-y-4">
            {[
              { key: "agenda", title: "Agenda", desc: "Vista interactiva de turnos por profesional" },
              { key: "servicios", title: "Servicios", desc: "CRUD de servicios con precio base y promocional" },
              { key: "clientes", title: "Clientes", desc: "CRM local con historial de turnos" },
              { key: "pagos", title: "Pagos", desc: "Seguimiento financiero de señas" },
              { key: "config", title: "Configuración", desc: "Parámetros del negocio y lista negra" },
            ].map((item) => (
              <div key={item.key} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}