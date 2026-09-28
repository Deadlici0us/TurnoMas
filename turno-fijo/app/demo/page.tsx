import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { enterDemo } from "./actions";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("common");
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (sessionCookie) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg w-full px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("appName")}</h1>
            <p className="text-lg text-slate-600">{t("demo.title")}</p>
          </div>
          <p className="text-sm text-slate-500 text-center">{t("demo.note")}</p>
          {error === "demo" && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              No se pudo entrar a la demo. Reintentá en unos segundos.
            </p>
          )}
          <form className="space-y-4" action={enterDemo}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input name="email" type="email" readOnly defaultValue="demo@turnofijo.com" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50" />
            </div>
            <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">
              {t("demo.cta")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}